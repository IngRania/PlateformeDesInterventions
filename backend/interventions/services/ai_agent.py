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

# Modèles essayés dans l'ordre : celui de la configuration (GEMINI_MODEL dans .env),
# puis des modèles « flash » rapides et gratuits dans les limites du quota.
# Si un modèle n'existe pas (ou plus), on passe automatiquement au suivant.
FALLBACK_MODELS = ["gemini-flash-latest", "gemini-2.5-flash", "gemini-2.0-flash"]


def _models_to_try():
    configured = getattr(settings, 'GEMINI_MODEL', '') or ''
    models = [configured] if configured else []
    return models + [m for m in FALLBACK_MODELS if m != configured]

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

    api_key = getattr(settings, 'GEMINI_API_KEY', '')
    if not api_key:
        raise AIAgentError("Clé GEMINI_API_KEY absente du fichier .env du backend.")

    try:
        client = genai.Client(api_key=api_key)
    except Exception as e:
        logger.exception("Initialisation du client Gemini impossible")
        raise AIAgentError(f"Initialisation du client IA impossible : {e}")

    last_error = None
    for model in _models_to_try():
        try:
            response = client.models.generate_content(model=model, contents=prompt)
            description = (response.text or "").strip()
            if description:
                return description
            last_error = "réponse vide"
        except genai_errors.APIError as e:
            code = getattr(e, 'code', None)
            logger.warning("Gemini (%s) a échoué : %s", model, e)
            last_error = str(e)
            if code == 404:
                continue  # modèle inconnu : on essaie le suivant
            if code in (401, 403) or (code == 400 and 'API key' in str(e)):
                raise AIAgentError("Clé GEMINI_API_KEY invalide ou non autorisée.")
            if code == 429:
                raise AIAgentError("Quota gratuit de l'IA épuisé, réessayez plus tard.")
            continue
        except Exception as e:
            logger.exception("Erreur inattendue avec le modèle %s", model)
            last_error = str(e)
            continue

    raise AIAgentError(f"Le service de génération est indisponible ({last_error}).")


def fallback_description(type_panne: str, contexte: str = "") -> str:
    """
    Suggestion générique utilisée quand l'IA est indisponible : le client
    obtient quand même une base à compléter au lieu d'un champ vide.
    """
    type_panne = (type_panne or "").strip()[:MAX_INPUT_LENGTH]
    texte = (
        f"Je signale le problème suivant : {type_panne}. "
        "Le dysfonctionnement a été constaté le [date] et se manifeste par [symptômes observés : "
        "bruit, panne totale, fonctionnement intermittent, message d'erreur…]. "
        "L'équipement concerné se trouve [localisation précise]. "
        "Merci d'intervenir dans les meilleurs délais."
    )
    if contexte:
        texte += f" Informations complémentaires : {contexte.strip()[:MAX_INPUT_LENGTH]}."
    return texte
