"""
Envoi de SMS réel via TextBelt (https://textbelt.com) — aucune inscription
requise pour tester (1 SMS gratuit/jour, clé 'textbelt'). Pour un usage
sérieux, acheter un petit crédit sur https://textbelt.com/purchase (aucune
vérification compte requise, juste un paiement par carte).
Si l'envoi échoue (quota épuisé, erreur réseau...), on retombe en mode
console pour ne jamais bloquer le développement.
"""
import requests
from django.conf import settings


def send_sms(phone: str, message: str) -> None:
    api_key = getattr(settings, 'TEXTBELT_API_KEY', 'textbelt')

    # Ajoute l'indicatif tunisien si absent (TextBelt exige le format international).
    normalized_phone = phone if phone.startswith('+') else f"+216{phone}"

    try:
        response = requests.post(
            'https://textbelt.com/text',
            {
                'phone': normalized_phone,
                'message': message,
                'key': api_key,
            },
            timeout=10,
        )
        data = response.json()

        if data.get('success'):
            print(f"[SMS] Envoyé avec succès à {normalized_phone} (quota restant: {data.get('quotaRemaining')})")
        else:
            print(f"[SMS] Échec de l'envoi réel : {data.get('error')}")
            print(f"[SMS - fallback console] Destinataire : {normalized_phone}")
            print(f"[SMS - fallback console] Message      : {message}")

    except Exception as exc:
        print(f"[SMS] Erreur réseau lors de l'envoi : {exc}")
        print(f"[SMS - fallback console] Destinataire : {normalized_phone}")
        print(f"[SMS - fallback console] Message      : {message}")