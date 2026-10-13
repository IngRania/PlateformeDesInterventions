from django.urls import path
from .views import TechnicianLocationListView

urlpatterns = [
    path('locations/', TechnicianLocationListView.as_view(), name='tracking-locations'),
]