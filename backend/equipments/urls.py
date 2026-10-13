from django.urls import path
from .views import (
    EquipmentListCreateView,
    EquipmentDetailView,
    ClientListView,
    MyEquipmentsView,
)

urlpatterns = [
    path('', EquipmentListCreateView.as_view(), name='equipment-list-create'),
    path('clients/', ClientListView.as_view(), name='equipment-clients'),
    path('mine/', MyEquipmentsView.as_view(), name='equipment-mine'),
    path('<int:pk>/', EquipmentDetailView.as_view(), name='equipment-detail'),
]