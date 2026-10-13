from django.conf import settings
from django.db import models


class Priorite(models.TextChoices):
    BASSE = 'BASSE', 'Basse'
    NORMALE = 'NORMALE', 'Normale'
    HAUTE = 'HAUTE', 'Haute'
    URGENTE = 'URGENTE', 'Urgente'


class StatutIntervention(models.TextChoices):
    EN_ATTENTE = 'EN_ATTENTE', 'En attente'
    AFFECTEE = 'AFFECTEE', 'Affectée'       # technicien choisi, pas encore commencé
    EN_COURS = 'EN_COURS', 'En cours'
    TERMINEE = 'TERMINEE', 'Terminée'


class Intervention(models.Model):
    # Qui a fait la demande
    client = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='interventions_demandees',
        limit_choices_to={'role': 'CLIENT'},
    )

    # Qui l'exécute (assigné par le responsable, donc nullable au départ)
    technicien = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True, blank=True,
        related_name='interventions_affectees',
        limit_choices_to={'role': 'TECHNICIEN'},
    )

    # Qui a affecté (traçabilité)
    affectee_par = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True, blank=True,
        related_name='interventions_gerees',
        limit_choices_to={'role': 'RESPONSABLE'},
    )

    type_panne = models.CharField(max_length=100)
    description = models.TextField()
    priorite = models.CharField(max_length=20, choices=Priorite.choices, default=Priorite.NORMALE)
    date_souhaitee = models.DateField(null=True, blank=True)

    statut = models.CharField(
        max_length=20, choices=StatutIntervention.choices, default=StatutIntervention.EN_ATTENTE
    )

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    date_affectation = models.DateTimeField(null=True, blank=True)
    date_debut = models.DateTimeField(null=True, blank=True)
    date_cloture = models.DateTimeField(null=True, blank=True)
    photo_avant = models.ImageField(upload_to='interventions/avant/', null=True, blank=True)
    photo_apres = models.ImageField(upload_to='interventions/apres/', null=True, blank=True)
    compte_rendu = models.TextField(blank=True, help_text="Résumé rédigé par le technicien à la clôture")

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return f"Intervention #{self.id} - {self.client.email} ({self.statut})"

class Avis(models.Model):
    intervention = models.OneToOneField(
        Intervention, on_delete=models.CASCADE, related_name='avis'
    )
    note = models.PositiveSmallIntegerField()  # 1 à 5
    commentaire = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"Avis {self.note}/5 — Intervention #{self.intervention_id}"