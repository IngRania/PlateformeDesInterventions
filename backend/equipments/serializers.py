from django.contrib.auth import get_user_model
from rest_framework import serializers

from .models import Equipment

User = get_user_model()


class ClientMiniSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = ['id', 'first_name', 'last_name', 'email']


class EquipmentSerializer(serializers.ModelSerializer):
    client_nom = serializers.CharField(source='client.full_name', read_only=True)
    client_email = serializers.CharField(source='client.email', read_only=True)

    class Meta:
        model = Equipment
        fields = [
            'id', 'client', 'client_nom', 'client_email',
            'type_equipement', 'reference', 'date_installation',
            'notes', 'created_at', 'updated_at',
        ]

    def validate_client(self, value):
        if value.role != 'CLIENT':
            raise serializers.ValidationError("Le propriétaire doit être un client.")
        return value


class EquipmentMiniSerializer(serializers.ModelSerializer):
    """Utilisé pour le menu déroulant côté client à la création d'une demande."""
    class Meta:
        model = Equipment
        fields = ['id', 'type_equipement', 'reference']