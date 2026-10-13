from django.contrib.auth import get_user_model
from rest_framework import generics
from rest_framework.permissions import IsAuthenticated

from .models import Equipment
from .permissions import IsAdminOrResponsable
from .serializers import ClientMiniSerializer, EquipmentMiniSerializer, EquipmentSerializer

User = get_user_model()


class EquipmentListCreateView(generics.ListCreateAPIView):
    """
    GET  /api/equipments/         -> liste (filtrable ?client=<id>), Admin/Responsable
    POST /api/equipments/         -> créer, Admin/Responsable
    """
    serializer_class = EquipmentSerializer
    permission_classes = [IsAdminOrResponsable]

    def get_queryset(self):
        qs = Equipment.objects.all()
        client_id = self.request.query_params.get('client')
        if client_id:
            qs = qs.filter(client_id=client_id)
        return qs


class EquipmentDetailView(generics.RetrieveUpdateDestroyAPIView):
    """GET/PATCH/PUT/DELETE /api/equipments/<id>/ — Admin/Responsable."""
    queryset = Equipment.objects.all()
    serializer_class = EquipmentSerializer
    permission_classes = [IsAdminOrResponsable]


class ClientListView(generics.ListAPIView):
    """GET /api/equipments/clients/ — liste des clients, pour le formulaire de création d'équipement."""
    serializer_class = ClientMiniSerializer
    permission_classes = [IsAdminOrResponsable]

    def get_queryset(self):
        return User.objects.filter(role='CLIENT').order_by('last_name')


class MyEquipmentsView(generics.ListAPIView):
    """GET /api/equipments/mine/ — les équipements du client connecté (pour le formulaire de demande)."""
    serializer_class = EquipmentMiniSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        if self.request.user.role != 'CLIENT':
            return Equipment.objects.none()
        return Equipment.objects.filter(client=self.request.user)