from rest_framework import generics
from rest_framework.permissions import IsAuthenticated
from .models import TechnicianLocation
from .serializers import TechnicianLocationSerializer


class TechnicianLocationListView(generics.ListAPIView):
    """GET /api/tracking/locations/ — positions actuelles de tous les techniciens."""
    serializer_class = TechnicianLocationSerializer
    permission_classes = [IsAuthenticated]
    queryset = TechnicianLocation.objects.all()