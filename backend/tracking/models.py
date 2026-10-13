from django.conf import settings
from django.db import models


class TechnicianLocation(models.Model):
    technicien = models.OneToOneField(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='location',
        limit_choices_to={'role': 'TECHNICIEN'},
    )
    latitude = models.FloatField()
    longitude = models.FloatField()
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"{self.technicien.email} @ ({self.latitude}, {self.longitude})"