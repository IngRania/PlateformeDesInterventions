import logging
from datetime import timedelta
import os
from io import BytesIO
import base64
from PIL import Image, ImageOps
from django.conf import settings
from django.contrib.auth import get_user_model
from django.core.mail import send_mail
from django.db.models import Avg, Count, F, Q
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

from tracking.models import TechnicianLocation

from .models import Intervention, Priorite, StatutIntervention
from .permissions import IsClient, IsResponsableOrAdmin, IsTechnicien
from .serializers import (
    AIDescriptionRequestSerializer,
    AvisSerializer,
    InterventionAssignSerializer,
    InterventionCreateSerializer,
    InterventionDetailSerializer,
    InterventionListSerializer,
    InterventionStatusUpdateSerializer,
    PhotoUploadSerializer,
    TechnicianMiniSerializer,
)
from .services.ai_agent import AIAgentError, fallback_description, generate_intervention_description

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


def _visible_interventions(user):
    """Interventions visibles selon le rôle (mêmes règles que la liste)."""
    qs = Intervention.objects.select_related('client', 'technicien', 'affectee_par')
    if user.role == 'CLIENT':
        return qs.filter(client=user)
    if user.role == 'TECHNICIEN':
        return qs.filter(technicien=user)
    return qs


class InterventionDetailView(APIView):
    """
    GET /api/interventions/<id>/ — détails complets d'une intervention.
    CLIENT -> ses demandes | TECHNICIEN -> celles qui lui sont affectées | RESPONSABLE/ADMIN -> toutes.
    """
    permission_classes = [IsAuthenticated]

    def get(self, request, pk):
        try:
            intervention = _visible_interventions(request.user).get(pk=pk)
        except Intervention.DoesNotExist:
            return Response({"detail": "Intervention introuvable."}, status=404)
        return Response(
            InterventionDetailSerializer(intervention, context={'request': request}).data
        )


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
STATUT_COULEURS = {
    StatutIntervention.EN_ATTENTE: '#64748B',
    StatutIntervention.AFFECTEE: '#2563EB',
    StatutIntervention.EN_COURS: '#D97706',
    StatutIntervention.TERMINEE: '#16A34A',
}
PRIORITE_COULEURS = {
    Priorite.BASSE: '#64748B',
    Priorite.NORMALE: '#0284C7',
    Priorite.HAUTE: '#D97706',
    Priorite.URGENTE: '#DC2626',
}


def _report_context(intervention):
    """Valeurs calculées pour le rapport PDF (référence, couleurs, durée, chronologie, avis)."""
    duree = None
    if intervention.date_debut and intervention.date_cloture:
        minutes = int((intervention.date_cloture - intervention.date_debut).total_seconds() // 60)
        heures, minutes = divmod(minutes, 60)
        duree = f"{heures} h {minutes:02d}" if heures else f"{minutes} min"

    try:
        avis = intervention.avis
    except Intervention.avis.RelatedObjectDoesNotExist:
        avis = None

    return {
        'reference': f"INT-{intervention.created_at:%Y}-{intervention.id:05d}",
        'statut_couleur': STATUT_COULEURS.get(intervention.statut, '#64748B'),
        'priorite_couleur': PRIORITE_COULEURS.get(intervention.priorite, '#64748B'),
        'duree': duree,
        'avis': avis,
        'etoiles': range(1, 6),
        'etapes': [
            {'nom': 'Demande créée', 'date': intervention.created_at},
            {'nom': 'Technicien affecté', 'date': intervention.date_affectation},
            {'nom': 'Intervention débutée', 'date': intervention.date_debut},
            {'nom': 'Intervention clôturée', 'date': intervention.date_cloture},
        ],
    }


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
                **_report_context(intervention),
                'date_generation': tz.localtime().strftime('%d/%m/%Y à %H:%M'),
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


def _calendar_day(intervention):
    """
    Jour où l'intervention apparaît dans le planning :
    - terminée -> date de clôture (ce qui a été fait)
    - sinon    -> date souhaitée, à défaut date d'affectation / de création (rien ne disparaît)
    """
    if intervention.statut == StatutIntervention.TERMINEE and intervention.date_cloture:
        return tz.localtime(intervention.date_cloture).date()
    if intervention.date_souhaitee:
        return intervention.date_souhaitee
    reference = intervention.date_affectation or intervention.created_at
    return tz.localtime(reference).date()


class TechnicianCalendarView(APIView):
    """
    GET /api/interventions/calendar/?start=YYYY-MM-DD&end=YYYY-MM-DD
    Réservé au responsable : chaque technicien + ses interventions (affectées, en cours
    et terminées) dans la période. Chaque intervention porte `date_calendrier`.
    """
    permission_classes = [IsResponsableOrAdmin]

    def get(self, request):
        start = parse_date(request.query_params.get('start', '') or '')
        end = parse_date(request.query_params.get('end', '') or '')

        interventions = Intervention.objects.select_related('client', 'technicien').filter(
            technicien__isnull=False,
            statut__in=[
                StatutIntervention.AFFECTEE,
                StatutIntervention.EN_COURS,
                StatutIntervention.TERMINEE,
            ],
        )

        par_technicien = {}
        for intervention in interventions:
            jour = _calendar_day(intervention)
            if (start and jour < start) or (end and jour > end):
                continue
            item = InterventionListSerializer(intervention, context={'request': request}).data
            item['date_calendrier'] = jour.isoformat()
            par_technicien.setdefault(intervention.technicien_id, []).append(item)

        data = [
            {
                'technicien': TechnicianMiniSerializer(tech).data,
                'interventions': par_technicien.get(tech.id, []),
            }
            for tech in User.objects.filter(role='TECHNICIEN').order_by('matricule')
        ]
        return Response(data, status=200)


class DashboardView(APIView):
    """
    GET /api/interventions/dashboard/ — indicateurs du tableau de bord, calculés
    sur le périmètre du rôle connecté (client : ses demandes, technicien : ses tâches,
    responsable/admin : toutes les interventions).
    """
    permission_classes = [IsAuthenticated]

    def get(self, request):
        user = request.user
        qs = _visible_interventions(user)
        today = tz.localdate()

        par_statut = {choice: 0 for choice in StatutIntervention.values}
        for row in qs.values('statut').annotate(total=Count('id')):
            par_statut[row['statut']] = row['total']

        par_priorite = {choice: 0 for choice in Priorite.values}
        for row in qs.values('priorite').annotate(total=Count('id')):
            par_priorite[row['priorite']] = row['total']

        # 6 derniers mois, mois sans intervention inclus (courbe continue)
        mois = []
        cursor = today.replace(day=1)
        for _ in range(6):
            mois.insert(0, cursor)
            cursor = (cursor - timedelta(days=1)).replace(day=1)
        totaux_mois = {
            row['mois'].strftime('%Y-%m'): row['total']
            for row in qs.filter(created_at__date__gte=mois[0])
            .annotate(mois=TruncMonth('created_at'))
            .values('mois')
            .annotate(total=Count('id'))
        }
        terminees_mois = {
            row['mois'].strftime('%Y-%m'): row['total']
            for row in qs.filter(statut=StatutIntervention.TERMINEE, date_cloture__date__gte=mois[0])
            .annotate(mois=TruncMonth('date_cloture'))
            .values('mois')
            .annotate(total=Count('id'))
        }
        par_mois = [
            {
                'mois': m.strftime('%Y-%m'),
                'creees': totaux_mois.get(m.strftime('%Y-%m'), 0),
                'terminees': terminees_mois.get(m.strftime('%Y-%m'), 0),
            }
            for m in mois
        ]

        temps_moyen = qs.filter(
            statut=StatutIntervention.TERMINEE, date_debut__isnull=False, date_cloture__isnull=False,
        ).aggregate(avg=Avg(F('date_cloture') - F('date_debut')))['avg']
        avis = qs.filter(avis__isnull=False).aggregate(moyenne=Avg('avis__note'), total=Count('avis'))

        total = qs.count()
        ouvertes = qs.exclude(statut=StatutIntervention.TERMINEE)
        data = {
            'role': user.role,
            'total': total,
            'par_statut': par_statut,
            'par_priorite': par_priorite,
            'par_mois': par_mois,
            'taux_resolution': round(100 * par_statut[StatutIntervention.TERMINEE] / total) if total else 0,
            'temps_moyen_resolution_heures': (
                round(temps_moyen.total_seconds() / 3600, 1) if temps_moyen else None
            ),
            'note_moyenne': round(avis['moyenne'], 1) if avis['moyenne'] else None,
            'nb_avis': avis['total'],
            'urgentes_ouvertes': ouvertes.filter(priorite__in=[Priorite.HAUTE, Priorite.URGENTE]).count(),
            'prevues_aujourdhui': ouvertes.filter(date_souhaitee=today).count(),
            'en_retard': ouvertes.filter(date_souhaitee__lt=today).count(),
            'recentes': InterventionListSerializer(
                qs[:6], many=True, context={'request': request}
            ).data,
        }

        if user.role in ('RESPONSABLE', 'ADMIN'):
            data['par_technicien'] = [
                {
                    'id': row['technicien'],
                    'nom': f"{row['technicien__first_name']} {row['technicien__last_name']}".strip(),
                    'matricule': row['technicien__matricule'],
                    'total': row['total'],
                    'terminees': row['terminees'],
                    'en_cours': row['en_cours'],
                }
                for row in qs.exclude(technicien__isnull=True)
                .values('technicien', 'technicien__first_name', 'technicien__last_name', 'technicien__matricule')
                .annotate(
                    total=Count('id'),
                    terminees=Count('id', filter=Q(statut=StatutIntervention.TERMINEE)),
                    en_cours=Count('id', filter=Q(statut__in=[
                        StatutIntervention.AFFECTEE, StatutIntervention.EN_COURS,
                    ])),
                )
                .order_by('-total')[:8]
            ]
            seuil = tz.now() - timedelta(minutes=10)
            data['techniciens'] = {
                'total': User.objects.filter(role='TECHNICIEN', is_active=True).count(),
                'localises': TechnicianLocation.objects.filter(updated_at__gte=seuil).count(),
                'disponibles': User.objects.filter(role='TECHNICIEN', is_active=True)
                .exclude(interventions_affectees__statut=StatutIntervention.EN_COURS)
                .count(),
            }

        if user.role == 'ADMIN':
            data['utilisateurs'] = {
                'total': User.objects.count(),
                'inactifs': User.objects.filter(is_active=False).count(),
                'par_role': {
                    row['role']: row['total']
                    for row in User.objects.values('role').annotate(total=Count('id'))
                },
            }

        return Response(data)


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

        type_panne = serializer.validated_data['type_panne']
        contexte = serializer.validated_data.get('contexte', '')
        try:
            description = generate_intervention_description(type_panne=type_panne, contexte=contexte)
        except AIAgentError as e:
            # L'IA est indisponible : on renvoie une suggestion générique plutôt qu'une erreur,
            # avec la raison pour que le client (et le développeur) sachent ce qui s'est passé.
            logger.warning("Génération IA indisponible : %s", e)
            return Response({
                "description": fallback_description(type_panne, contexte),
                "source": "modele",
                "detail": str(e),
            }, status=200)

        return Response({"description": description, "source": "ia"}, status=200)