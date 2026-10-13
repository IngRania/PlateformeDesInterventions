"""
Diagnostic de l'assistant IA (Gemini) :

    python manage.py tester_ia

Vérifie la clé, affiche le modèle configuré, liste les modèles « flash » disponibles
pour cette clé, puis génère une description de test avec le même code que l'application.
"""
from django.conf import settings
from django.core.management.base import BaseCommand

from interventions.services import ai_agent


class Command(BaseCommand):
    help = "Teste la connexion à l'IA Gemini et liste les modèles disponibles pour la clé."

    def handle(self, *args, **options):
        key = getattr(settings, 'GEMINI_API_KEY', '')
        self.stdout.write(f"Clé GEMINI_API_KEY : {'présente (' + key[:6] + '…)' if key else 'ABSENTE'}")
        self.stdout.write(f"Modèle configuré (GEMINI_MODEL) : {getattr(settings, 'GEMINI_MODEL', '') or '—'}")
        self.stdout.write(f"Ordre d'essai : {', '.join(ai_agent._models_to_try())}")
        if not key:
            self.stderr.write(self.style.ERROR("Ajoutez GEMINI_API_KEY=... dans backend/.env"))
            return

        try:
            client = ai_agent.genai.Client(api_key=key)
            models = ai_agent.discover_models(client)
        except Exception as e:  # noqa: BLE001 — diagnostic : on affiche tout
            self.stderr.write(self.style.ERROR(f"Connexion à Gemini impossible : {e}"))
            return

        if models:
            self.stdout.write("Modèles « flash » disponibles pour cette clé :")
            for name in models:
                self.stdout.write(f"  - {name}")
        else:
            self.stdout.write(self.style.WARNING("Aucun modèle « flash » listé pour cette clé."))

        self.stdout.write("\nTest de génération…")
        try:
            text = ai_agent.generate_intervention_description("Climatiseur en panne")
        except ai_agent.AIAgentError as e:
            self.stderr.write(self.style.ERROR(f"ÉCHEC : {e}"))
            return
        self.stdout.write(self.style.SUCCESS(f"OK avec le modèle « {ai_agent._working_model} » :"))
        self.stdout.write(text)
        self.stdout.write(
            f"\nConseil : mettez GEMINI_MODEL={ai_agent._working_model} dans backend/.env "
            "pour éviter les essais au démarrage."
        )
