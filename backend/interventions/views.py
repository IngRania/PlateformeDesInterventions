import logging
import os
from io import BytesIO
import base64
from PIL import Image, ImageOps
from django.conf import settings
from django.contrib.auth import get_user_model
from django.core.mail import send_mail
from django.db.models import Avg, Count, F
from django.db.models.functions import TruncMonth
from django.http import HttpResponse
from django.template.loader import render_to_string
from django.utils import timezone as tz
from django.utils.dateparse import parse_date
from rest_framework import generics
from rest_framework.parsers import FormParser, MultiPartParser
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView
from xhtml2pdf import pisa

from .models import Intervention, StatutIntervention
from .permissions import IsClient, IsResponsableOrAdmin, IsTechnicien
from .serializers import (
    AIDescriptionRequestSerializer,
    AvisSerializer,
    InterventionAssignSerializer,
    InterventionCreateSerializer,
    InterventionListSerializer,
    InterventionStatusUpdateSerializer,
    PhotoUploadSerializer,
    TechnicianMiniSerializer,
)
from .services.ai_agent import AIAgentError, generate_intervention_description

User = get_user_model()
logger = logging.getLogger(__name__)


class InterventionCreateView(generics.CreateAPIView):
    """POST /api/interventions/create/ — le client crée sa demande."""
    serializer_class = InterventionCreateSerializer
    permission_classes = [IsClient]

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data, context={'request': request})
        serializer.is_valid(raise_exception=True)
        intervention = serializer.save()
        return Response(
            InterventionListSerializer(intervention, context={'request': request}).data,
            status=201,
        )


class InterventionListView(generics.ListAPIView):
    """
    GET /api/interventions/ — liste filtrée selon le rôle :
    CLIENT -> ses demandes | TECHNICIEN -> celles affectées | RESPONSABLE/ADMIN -> toutes.
    Filtre optionnel : ?statut=EN_ATTENTE
    """
    serializer_class = InterventionListSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        user = self.request.user
        qs = Intervention.objects.all()

        if user.role == 'CLIENT':
            qs = qs.filter(client=user)
        elif user.role == 'TECHNICIEN':
            qs = qs.filter(technicien=user)

        statut = self.request.query_params.get('statut')
        if statut:
            qs = qs.filter(statut=statut)
        return qs

    def get_serializer_context(self):
        return {'request': self.request}


class InterventionAssignView(APIView):
    """PATCH /api/interventions/<id>/assign/ — le responsable affecte un technicien."""
    permission_classes = [IsResponsableOrAdmin]

    def patch(self, request, pk):
        try:
            intervention = Intervention.objects.get(pk=pk)
        except Intervention.DoesNotExist:
            return Response({"detail": "Intervention introuvable."}, status=404)

        serializer = InterventionAssignSerializer(
            data=request.data, context={'intervention': intervention, 'request': request}
        )
        serializer.is_valid(raise_exception=True)
        intervention = serializer.save()

        technicien = intervention.technicien
        if technicien and technicien.email:
            try:
                send_mail(
                    subject="InTech Interventions — Nouvelle intervention affectée",
                    message=(
                        f"Bonjour {technicien.first_name},\n\n"
                        f"Une nouvelle intervention vous a été affectée :\n\n"
                        f"Type : {intervention.type_panne}\n"
                        f"Description : {intervention.description}\n"
                        f"Priorité : {intervention.priorite}\n"
                        f"Client : {intervention.client.full_name}\n"
                        f"Date souhaitée : {intervention.date_souhaitee or 'Non spécifiée'}\n\n"
                        f"Connectez-vous à la plateforme pour consulter les détails."
                    ),
                    from_email=settings.DEFAULT_FROM_EMAIL,
                    recipient_list=[technicien.email],
                    fail_silently=False,
                )
            except Exception:
                # L'affectation reste valide même si l'email échoue.
                logger.exception("Échec de l'envoi de l'email d'affectation (intervention %s)", pk)

        return Response(
            InterventionListSerializer(intervention, context={'request': request}).data,
            status=200,
        )


class InterventionStatusUpdateView(APIView):
    """PATCH /api/interventions/<id>/status/ — le technicien fait avancer le statut."""
    permission_classes = [IsTechnicien]

    def patch(self, request, pk):
        try:
            intervention = Intervention.objects.get(pk=pk, technicien=request.user)
        except Intervention.DoesNotExist:
            return Response({"detail": "Intervention introuvable ou non affectée à vous."}, status=404)

        serializer = InterventionStatusUpdateSerializer(
            data=request.data, context={'intervention': intervention}
        )
        serializer.is_valid(raise_exception=True)
        intervention = serializer.save()
        return Response(
            InterventionListSerializer(intervention, context={'request': request}).data,
            status=200,
        )


class InterventionPhotoUploadView(APIView):
    """POST /api/interventions/<id>/photo/ — multipart, champs 'type_photo' (avant/apres) + 'photo'."""
    permission_classes = [IsTechnicien]
    parser_classes = [MultiPartParser, FormParser]

    def post(self, request, pk):
        try:
            intervention = Intervention.objects.get(pk=pk, technicien=request.user)
        except Intervention.DoesNotExist:
            return Response({"detail": "Intervention introuvable ou non affectée à vous."}, status=404)

        serializer = PhotoUploadSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        if serializer.validated_data['type_photo'] == 'avant':
            intervention.photo_avant = serializer.validated_data['photo']
        else:
            intervention.photo_apres = serializer.validated_data['photo']
        intervention.save()

        return Response(
            InterventionListSerializer(intervention, context={'request': request}).data,
            status=200,
        )


def link_callback(uri, rel):
    """
    xhtml2pdf appelle cette fonction pour chaque ressource (images, CSS...).
    Les photos sont passées en chemins absolus du disque : on les renvoie telles quelles.
    """
    return uri


def _photo_data_uri(field, max_size=900):
    """
    Lit la photo, la corrige (rotation EXIF), la réduit et la renvoie en data URI.
    Retourne '' si la photo est absente ou illisible.
    """
    if not field:
        return ''
    try:
        path = field.path
        if not os.path.isfile(path):
            return ''
        with Image.open(path) as img:
            img = ImageOps.exif_transpose(img).convert('RGB')
            img.thumbnail((max_size, max_size))
            buf = BytesIO()
            img.save(buf, format='JPEG', quality=85)
        encoded = base64.b64encode(buf.getvalue()).decode('ascii')
        return f'data:image/jpeg;base64,{encoded}'
    except Exception:
        logger.exception("Impossible de charger la photo %s", field)
        return ''
class InterventionPDFView(APIView):
    """
    GET /api/interventions/<id>/pdf/
    Admin/Responsable : accès total. Client : uniquement ses propres interventions terminées.
    """
    permission_classes = [IsAuthenticated]

    def get(self, request, pk):
        try:
            intervention = Intervention.objects.get(pk=pk)
        except Intervention.DoesNotExist:
            return Response({"detail": "Intervention introuvable."}, status=404)

        user = request.user
        is_owner_client = user.role == 'CLIENT' and intervention.client_id == user.id
        is_staff = user.role in ('ADMIN', 'RESPONSABLE')
        if not (is_owner_client or is_staff):
            return Response({"detail": "Accès refusé."}, status=403)

        if intervention.statut != StatutIntervention.TERMINEE:
            return Response(
                {"detail": "Le rapport n'est disponible qu'une fois l'intervention terminée."},
                status=400,
            )

        try:
            html_string = render_to_string('interventions/report.html', {
                'intervention': intervention,
                'date_generation': tz.now().strftime('%d/%m/%Y %H:%M'),
                'photo_avant_path': _photo_data_uri(intervention.photo_avant),
                'photo_apres_path': _photo_data_uri(intervention.photo_apres),
            })

            buffer = BytesIO()
            result = pisa.CreatePDF(
                html_string, dest=buffer, encoding='utf-8', link_callback=link_callback
            )
        except Exception as e:
            logger.exception("Erreur lors de la génération du PDF (intervention %s)", pk)
            return Response({"detail": f"Génération du PDF impossible : {e}"}, status=500)

        if result.err:
            logger.error("xhtml2pdf a signalé %s erreur(s) (intervention %s)", result.err, pk)
            return Response(
                {"detail": "Génération du PDF impossible (HTML/CSS du template)."}, status=500
            )

        response = HttpResponse(buffer.getvalue(), content_type='application/pdf')
        response['Content-Disposition'] = f'attachment; filename="intervention_{intervention.id}.pdf"'
        return response


class InterventionStatsView(APIView):
    """GET /api/interventions/stats/ — Admin/Responsable uniquement."""
    permission_classes = [IsResponsableOrAdmin]

    def get(self, request):
        qs = Intervention.objects.all()

        par_statut = list(
            qs.values('statut').annotate(total=Count('id')).order_by('statut')
        )

        par_technicien = list(
            qs.exclude(technicien__isnull=True)
            .values('technicien__first_name', 'technicien__last_name', 'technicien__matricule')
            .annotate(total=Count('id'))
            .order_by('-total')
        )

        terminees = qs.filter(
            statut=StatutIntervention.TERMINEE,
            date_debut__isnull=False,
            date_cloture__isnull=False,
        )
        temps_moyen = terminees.aggregate(
            avg_heures=Avg(F('date_cloture') - F('date_debut'))
        )['avg_heures']
        temps_moyen_heures = round(temps_moyen.total_seconds() / 3600, 1) if temps_moyen else None

        par_mois = list(
            qs.annotate(mois=TruncMonth('created_at'))
            .values('mois')
            .annotate(total=Count('id'))
            .order_by('mois')
        )
        par_mois_formatte = [
            {'mois': item['mois'].strftime('%Y-%m'), 'total': item['total']}
            for item in par_mois
        ]

        return Response({
            'par_statut': par_statut,
            'par_technicien': par_technicien,
            'temps_moyen_resolution_heures': temps_moyen_heures,
            'par_mois': par_mois_formatte,
            'total_interventions': qs.count(),
        })


class TechnicianCalendarView(APIView):
    """
    GET /api/interventions/calendar/?start=YYYY-MM-DD&end=YYYY-MM-DD
    Réservé au responsable : chaque technicien + ses interventions (affectées/en cours)
    dans la période, pour visualiser les disponibilités.
    """
    permission_classes = [IsResponsableOrAdmin]

    def get(self, request):
        start = parse_date(request.query_params.get('start', '') or '')
        end = parse_date(request.query_params.get('end', '') or '')

        data = []
        for tech in User.objects.filter(role='TECHNICIEN'):
            qs = Intervention.objects.filter(
                technicien=tech,
                statut__in=[StatutIntervention.AFFECTEE, StatutIntervention.EN_COURS],
            )
            if start:
                qs = qs.filter(date_souhaitee__gte=start)
            if end:
                qs = qs.filter(date_souhaitee__lte=end)

            data.append({
                'technicien': TechnicianMiniSerializer(tech).data,
                'interventions': InterventionListSerializer(
                    qs, many=True, context={'request': request}
                ).data,
            })

        return Response(data, status=200)


class InterventionAvisView(APIView):
    """POST /api/interventions/<id>/avis/ — le client note son intervention terminée, une seule fois."""
    permission_classes = [IsClient]

    def post(self, request, pk):
        try:
            intervention = Intervention.objects.get(pk=pk, client=request.user)
        except Intervention.DoesNotExist:
            return Response({"detail": "Intervention introuvable."}, status=404)

        if intervention.statut != StatutIntervention.TERMINEE:
            return Response(
                {"detail": "Vous ne pouvez évaluer qu'une intervention terminée."}, status=400
            )

        if hasattr(intervention, 'avis'):
            return Response(
                {"detail": "Un avis a déjà été soumis pour cette intervention."}, status=400
            )

        serializer = AvisSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        serializer.save(intervention=intervention)

        return Response(
            InterventionListSerializer(intervention, context={'request': request}).data,
            status=201,
        )


class InterventionAIDescriptionView(APIView):
    """
    POST /api/interventions/generate-description/
    Body : { "type_panne": "...", "contexte": "..." (optionnel) }
    Retourne une suggestion de description que le client doit valider/modifier.
    """
    permission_classes = [IsAuthenticated]

    def post(self, request):
        serializer = AIDescriptionRequestSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        try:
            description = generate_intervention_description(
                type_panne=serializer.validated_data['type_panne'],
                contexte=serializer.validated_data.get('contexte', ''),
            )
        except AIAgentError as e:
            return Response({"detail": str(e)}, status=503)

        return Response({"description": description}, status=200)