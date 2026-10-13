from rest_framework import serializers
from .models import TechnicianLocation


class TechnicianLocationSerializer(serializers.ModelSerializer):
    technicien_id = serializers.IntegerField(source='technicien.id', read_only=True)
    technicien_nom = serializers.CharField(source='technicien.full_name', read_only=True)

    class Meta:
        model = TechnicianLocation
        fields = ['technicien_id', 'technicien_nom', 'latitude', 'longitude', 'updated_at']