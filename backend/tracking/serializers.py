from rest_framework import serializers
from .models import TechnicianLocation


class TechnicianLocationSerializer(serializers.ModelSerializer):
    technicien_id = serializers.IntegerField(source='technicien.id', read_only=True)
    technicien_nom = serializers.CharField(source='technicien.full_name', read_only=True)
    technicien_matricule = serializers.CharField(source='technicien.matricule', read_only=True)
    technicien_telephone = serializers.CharField(source='technicien.phone', read_only=True)
    intervention_en_cours = serializers.SerializerMethodField()

    class Meta:
        model = TechnicianLocation
        fields = [
            'technicien_id', 'technicien_nom', 'technicien_matricule', 'technicien_telephone',
            'latitude', 'longitude', 'updated_at', 'intervention_en_cours',
        ]

    def get_intervention_en_cours(self, obj):
        """Intervention sur laquelle travaille le technicien (en cours, sinon la prochaine affectée)."""
        from interventions.models import StatutIntervention

        intervention = (
            obj.technicien.interventions_affectees
            .filter(statut__in=[StatutIntervention.EN_COURS, StatutIntervention.AFFECTEE])
            .order_by('-statut', 'date_souhaitee')  # EN_COURS avant AFFECTEE
            .first()
        )
        if intervention is None:
            return None
        return {
            'id': intervention.id,
            'type_panne': intervention.type_panne,
            'statut': intervention.statut,
            'client_nom': intervention.client.full_name,
        }


class LocationUpdateSerializer(serializers.Serializer):
    latitude = serializers.FloatField(min_value=-90, max_value=90)
    longitude = serializers.FloatField(min_value=-180, max_value=180)
