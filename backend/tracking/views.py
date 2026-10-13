from asgiref.sync import async_to_sync
from channels.layers import get_channel_layer
from rest_framework import generics
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from interventions.permissions import IsResponsableOrAdmin, IsTechnicien

from .consumers import GROUP_NAME
from .models import TechnicianLocation
from .serializers import LocationUpdateSerializer, TechnicianLocationSerializer


class TechnicianLocationListView(generics.ListAPIView):
    """GET /api/tracking/locations/ — positions actuelles de tous les techniciens (responsable/admin)."""
    serializer_class = TechnicianLocationSerializer
    permission_classes = [IsResponsableOrAdmin]
    queryset = TechnicianLocation.objects.select_related('technicien').filter(technicien__is_active=True)


class MyLocationView(APIView):
    """
    GET  /api/tracking/me/ — dernière position partagée par le technicien connecté.
    POST /api/tracking/me/ — { latitude, longitude } : alternative HTTP au WebSocket
    (réseau mobile instable, proxy bloquant les WebSockets...). La position est
    ensuite diffusée aux cartes ouvertes comme si elle venait du WebSocket.
    """
    permission_classes = [IsAuthenticated, IsTechnicien]

    def get(self, request):
        location = TechnicianLocation.objects.filter(technicien=request.user).first()
        if location is None:
            return Response({"detail": "Aucune position partagée pour l'instant."}, status=404)
        return Response(TechnicianLocationSerializer(location).data)

    def post(self, request):
        serializer = LocationUpdateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        latitude = serializer.validated_data['latitude']
        longitude = serializer.validated_data['longitude']

        location, _ = TechnicianLocation.objects.update_or_create(
            technicien=request.user,
            defaults={'latitude': latitude, 'longitude': longitude},
        )

        channel_layer = get_channel_layer()
        if channel_layer is not None:
            async_to_sync(channel_layer.group_send)(GROUP_NAME, {
                'type': 'location_update',
                'technicien_id': request.user.id,
                'technicien_nom': request.user.full_name,
                'latitude': latitude,
                'longitude': longitude,
            })

        return Response(TechnicianLocationSerializer(location).data, status=200)
