from django.utils import timezone
from django.contrib.auth import get_user_model
from rest_framework import serializers


from .models import Intervention, StatutIntervention , Avis

User = get_user_model()


class TechnicianMiniSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = ['id', 'matricule', 'first_name', 'last_name', 'email']


class InterventionCreateSerializer(serializers.ModelSerializer):
    """Le client crée sa demande — statut EN_ATTENTE forcé, client = request.user."""
    class Meta:
        model = Intervention
        fields = ['id', 'type_panne', 'description', 'priorite', 'date_souhaitee']
        read_only_fields = ['id']

    def create(self, validated_data):
        request = self.context['request']
        return Intervention.objects.create(client=request.user, **validated_data)


class InterventionAssignSerializer(serializers.Serializer):
    """Le responsable affecte un technicien à une intervention EN_ATTENTE."""
    technicien_id = serializers.IntegerField()

    def validate_technicien_id(self, value):
        try:
            tech = User.objects.get(id=value, role='TECHNICIEN')
        except User.DoesNotExist:
            raise serializers.ValidationError("Technicien introuvable.")
        self.technicien = tech
        return value

    def validate(self, attrs):
        intervention = self.context['intervention']
        if intervention.statut != StatutIntervention.EN_ATTENTE:
            raise serializers.ValidationError("Cette intervention a déjà été affectée.")
        return attrs

    def save(self, **kwargs):
        intervention = self.context['intervention']
        request = self.context['request']
        intervention.technicien = self.technicien
        intervention.affectee_par = request.user
        intervention.statut = StatutIntervention.AFFECTEE
        intervention.date_affectation = timezone.now()
        intervention.save()
        return intervention

class InterventionStatusUpdateSerializer(serializers.Serializer):
    """Le technicien fait progresser le statut : AFFECTEE -> EN_COURS -> TERMINEE."""
    statut = serializers.ChoiceField(
        choices=[StatutIntervention.EN_COURS, StatutIntervention.TERMINEE]
    )
    compte_rendu = serializers.CharField(required=False, allow_blank=True)

    TRANSITIONS_AUTORISEES = {
        StatutIntervention.AFFECTEE: [StatutIntervention.EN_COURS],
        StatutIntervention.EN_COURS: [StatutIntervention.TERMINEE],
    }

    def validate_statut(self, value):
        intervention = self.context['intervention']
        autorises = self.TRANSITIONS_AUTORISEES.get(intervention.statut, [])
        if value not in autorises:
            raise serializers.ValidationError(
                f"Transition invalide : {intervention.statut} -> {value}."
            )
        return value

    def validate(self, attrs):
        intervention = self.context['intervention']
        if attrs['statut'] == StatutIntervention.TERMINEE:
            if not attrs.get('compte_rendu', '').strip():
                raise serializers.ValidationError(
                    {"compte_rendu": "Un compte-rendu est requis pour clôturer l'intervention."}
                )
            if not intervention.photo_avant or not intervention.photo_apres:
                raise serializers.ValidationError(
                    {"photos": "Les photos avant et après intervention sont obligatoires pour clôturer."}
                )
        return attrs

    def save(self, **kwargs):
        intervention = self.context['intervention']
        new_statut = self.validated_data['statut']
        intervention.statut = new_statut
        if new_statut == StatutIntervention.EN_COURS:
            intervention.date_debut = timezone.now()
        elif new_statut == StatutIntervention.TERMINEE:
            intervention.date_cloture = timezone.now()
            intervention.compte_rendu = self.validated_data.get('compte_rendu', '')
        intervention.save()
        return intervention


class PhotoUploadSerializer(serializers.Serializer):
    type_photo = serializers.ChoiceField(choices=['avant', 'apres'])
    photo = serializers.ImageField()

class AvisSerializer(serializers.ModelSerializer):
    class Meta:
        model = Avis
        fields = ['id', 'note', 'commentaire', 'created_at']
        read_only_fields = ['id', 'created_at']

    def validate_note(self, value):
        if not (1 <= value <= 5):
            raise serializers.ValidationError("La note doit être comprise entre 1 et 5.")
        return value


class InterventionListSerializer(serializers.ModelSerializer):
    client_nom = serializers.CharField(source='client.full_name', read_only=True)
    client_email = serializers.CharField(source='client.email', read_only=True)
    technicien_nom = serializers.CharField(source='technicien.full_name', read_only=True)
    technicien_matricule = serializers.CharField(source='technicien.matricule', read_only=True)
    photo_avant_url = serializers.SerializerMethodField()
    photo_apres_url = serializers.SerializerMethodField()
    avis = serializers.SerializerMethodField()

    class Meta:
        model = Intervention
        fields = [
            'id', 'client_nom', 'client_email', 'type_panne', 'description',
            'priorite', 'date_souhaitee', 'statut',
            'technicien', 'technicien_nom', 'technicien_matricule',
            'photo_avant_url', 'photo_apres_url', 'compte_rendu', 'avis',
            'created_at', 'date_affectation', 'date_debut', 'date_cloture',
        ]

    def get_photo_avant_url(self, obj):
        request = self.context.get('request')
        if obj.photo_avant and request:
            return request.build_absolute_uri(obj.photo_avant.url)
        return None

    def get_photo_apres_url(self, obj):
        request = self.context.get('request')
        if obj.photo_apres and request:
            return request.build_absolute_uri(obj.photo_apres.url)
        return None

    def get_avis(self, obj):
        avis = getattr(obj, 'avis', None)
        if avis:
            return AvisSerializer(avis).data
        return None

class InterventionDetailSerializer(InterventionListSerializer):
    """Vue détaillée d'une intervention (page « Détails ») : ajoute les contacts et la traçabilité."""
    client_telephone = serializers.CharField(source='client.phone', read_only=True)
    technicien_email = serializers.CharField(source='technicien.email', read_only=True)
    technicien_telephone = serializers.CharField(source='technicien.phone', read_only=True)
    affectee_par_nom = serializers.CharField(source='affectee_par.full_name', read_only=True)
    duree_resolution_heures = serializers.SerializerMethodField()

    class Meta(InterventionListSerializer.Meta):
        fields = InterventionListSerializer.Meta.fields + [
            'client_telephone', 'technicien_email', 'technicien_telephone',
            'affectee_par_nom', 'updated_at', 'duree_resolution_heures',
        ]

    def get_duree_resolution_heures(self, obj):
        if obj.date_debut and obj.date_cloture:
            return round((obj.date_cloture - obj.date_debut).total_seconds() / 3600, 1)
        return None


class AIDescriptionRequestSerializer(serializers.Serializer):
    """Validation de la requête envoyée par le frontend pour générer une description."""
    type_panne = serializers.CharField(max_length=300)
    contexte = serializers.CharField(max_length=300, required=False, allow_blank=True)

