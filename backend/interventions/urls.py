from django.urls import path
from .views import (
    InterventionCreateView,
    InterventionListView,
    InterventionAssignView,
    InterventionStatusUpdateView,
    InterventionPhotoUploadView,
    InterventionPDFView,
    InterventionStatsView,
    TechnicianCalendarView, InterventionAvisView, InterventionAIDescriptionView,
    InterventionDetailView, DashboardView,
)

urlpatterns = [
    path('', InterventionListView.as_view(), name='intervention-list'),
    path('create/', InterventionCreateView.as_view(), name='intervention-create'),
    path('calendar/', TechnicianCalendarView.as_view(), name='intervention-calendar'),
    path('dashboard/', DashboardView.as_view(), name='intervention-dashboard'),
    path('<int:pk>/', InterventionDetailView.as_view(), name='intervention-detail'),
    path('stats/', InterventionStatsView.as_view(), name='intervention-stats'),
    path('<int:pk>/avis/', InterventionAvisView.as_view(), name='intervention-avis'),
    path('<int:pk>/assign/', InterventionAssignView.as_view(), name='intervention-assign'),
    path('<int:pk>/status/', InterventionStatusUpdateView.as_view(), name='intervention-status'),
    path('<int:pk>/photo/', InterventionPhotoUploadView.as_view(), name='intervention-photo'),
    path('<int:pk>/pdf/', InterventionPDFView.as_view(), name='intervention-pdf'),
    path(
        'generate-description/',
        InterventionAIDescriptionView.as_view(),
        name='intervention-generate-description',
    ),

]