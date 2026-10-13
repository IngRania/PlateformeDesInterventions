from django.conf import settings
from django.db import models


class Equipment(models.Model):
    client = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='equipements',
        limit_choices_to={'role': 'CLIENT'},
    )
    type_equipement = models.CharField(max_length=100)
    reference = models.CharField(max_length=100, unique=True)
    date_installation = models.DateField(null=True, blank=True)
    notes = models.TextField(blank=True)

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return f"{self.type_equipement} ({self.reference}) — {self.client.email}"