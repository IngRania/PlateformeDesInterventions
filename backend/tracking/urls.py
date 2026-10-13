from django.urls import path
from .views import MyLocationView, TechnicianLocationListView

urlpatterns = [
    path('locations/', TechnicianLocationListView.as_view(), name='tracking-locations'),
    path('me/', MyLocationView.as_view(), name='tracking-me'),
]
