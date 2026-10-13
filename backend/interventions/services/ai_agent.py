"""
interventions/services/ai_agent.py

Service isolé pour la génération de description d'intervention via l'API Google Gemini
(quota gratuit, sans carte bancaire requise).
Isoler cette logique dans un service (plutôt que dans la vue) permet de :
- la tester unitairement sans passer par HTTP
- la remplacer facilement (autre modèle, autre provider) sans toucher aux vues
- centraliser la gestion des erreurs et des timeouts
"""
import logging

from google import genai
from google.genai import errors as genai_errors
from django.conf import settings

logger = logging.getLogger(__name__)

# Modèle recommandé : rapide, gratuit dans les limites du quota, bien adapté
# à une tâche de génération de texte courte.
MODEL_NAME = "gemini-3.6-flash"

MAX_INPUT_LENGTH = 300  # limite volontaire pour éviter les abus / prompts trop longs


class AIAgentError(Exception):
    """Erreur levée quand la génération IA échoue (timeout, quota, API down...)."""
    pass


def generate_intervention_description(type_panne: str, contexte: str = "") -> str:
    """
    Génère une proposition de description détaillée à partir du type de panne
    saisi par le client (et d'un contexte optionnel, ex: type d'équipement).

    Le texte retourné est une SUGGESTION : le client doit pouvoir la relire
    et la modifier avant soumission finale, jamais l'envoyer automatiquement.
    """
    if not type_panne or not type_panne.strip():
        raise AIAgentError("Le type de panne est requis pour générer une description.")

    type_panne = type_panne.strip()[:MAX_INPUT_LENGTH]
    contexte = (contexte or "").strip()[:MAX_INPUT_LENGTH]

    prompt = (
        "Tu es un assistant qui aide un client à décrire un problème technique "
        "pour une demande d'intervention (plomberie, électricité, chauffage, "
        "informatique, etc. selon le contexte). "
        "À partir du type de panne indiqué, rédige une description claire et "
        "concise (3 à 5 phrases) que le client pourra ensuite modifier. "
        "N'invente pas de détails techniques précis (ex: marque, référence) "
        "que le client n'a pas fournis — reste général et orienté symptômes. "
        "Réponds uniquement avec la description, sans introduction ni commentaire.\n\n"
        f"Type de panne : {type_panne}\n"
    )
    if contexte:
        prompt += f"Contexte additionnel : {contexte}\n"

    try:
        client = genai.Client(api_key=settings.GEMINI_API_KEY)
        response = client.models.generate_content(
            model=MODEL_NAME,
            contents=prompt,
        )
        description = (response.text or "").strip()

        if not description:
            raise AIAgentError("Réponse vide de l'agent IA.")

        return description

    except genai_errors.APIError as e:
        logger.error("Erreur API Gemini: %s", e)
        raise AIAgentError("Le service de génération est momentanément indisponible.")
    except Exception:
        logger.exception("Erreur inattendue dans l'agent IA")
        raise AIAgentError("Une erreur inattendue est survenue.")