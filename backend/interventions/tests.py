from datetime import timedelta

from django.contrib.auth import get_user_model
from django.utils import timezone
from rest_framework.test import APITestCase

from .models import Avis, Intervention, StatutIntervention

User = get_user_model()


class BaseInterventionTest(APITestCase):
    @classmethod
    def setUpTestData(cls):
        cls.admin = User.objects.create_user('admin@test.tn', 'pass', role='ADMIN')
        cls.resp = User.objects.create_user('resp@test.tn', 'pass', role='RESPONSABLE', matricule='R0001')
        cls.tech = User.objects.create_user('tech@test.tn', 'pass', role='TECHNICIEN', matricule='T0001',
                                            first_name='Karim', last_name='T')
        cls.other_tech = User.objects.create_user('tech2@test.tn', 'pass', role='TECHNICIEN', matricule='T0002')
        cls.client_a = User.objects.create_user('a@test.tn', 'pass', role='CLIENT', phone='98000000')
        cls.client_b = User.objects.create_user('b@test.tn', 'pass', role='CLIENT')

        now = timezone.now()
        today = timezone.localdate()
        cls.pending = Intervention.objects.create(
            client=cls.client_a, type_panne='Clim', description='d', priorite='URGENTE', date_souhaitee=today,
        )
        cls.assigned = Intervention.objects.create(
            client=cls.client_a, type_panne='Imprimante', description='d', technicien=cls.tech,
            affectee_par=cls.resp, statut=StatutIntervention.AFFECTEE, date_souhaitee=today,
            date_affectation=now,
        )
        cls.done = Intervention.objects.create(
            client=cls.client_b, type_panne='Porte', description='d', technicien=cls.tech,
            statut=StatutIntervention.TERMINEE, date_souhaitee=today - timedelta(days=5),
            date_debut=now - timedelta(hours=3), date_cloture=now - timedelta(hours=1),
        )
        Avis.objects.create(intervention=cls.done, note=4)


class InterventionDetailTests(BaseInterventionTest):
    def test_client_sees_own_intervention_with_contacts(self):
        self.client.force_authenticate(self.client_a)
        res = self.client.get(f'/api/interventions/{self.assigned.id}/')
        self.assertEqual(res.status_code, 200)
        self.assertEqual(res.data['client_telephone'], '98000000')
        self.assertEqual(res.data['technicien_matricule'], 'T0001')
        self.assertEqual(res.data['affectee_par_nom'], '')

    def test_client_cannot_see_other_client_intervention(self):
        self.client.force_authenticate(self.client_a)
        self.assertEqual(self.client.get(f'/api/interventions/{self.done.id}/').status_code, 404)

    def test_technician_only_sees_assigned(self):
        self.client.force_authenticate(self.other_tech)
        self.assertEqual(self.client.get(f'/api/interventions/{self.assigned.id}/').status_code, 404)
        self.client.force_authenticate(self.tech)
        self.assertEqual(self.client.get(f'/api/interventions/{self.assigned.id}/').status_code, 200)

    def test_staff_sees_everything_and_duration(self):
        self.client.force_authenticate(self.resp)
        res = self.client.get(f'/api/interventions/{self.done.id}/')
        self.assertEqual(res.status_code, 200)
        self.assertEqual(res.data['duree_resolution_heures'], 2.0)
        self.assertEqual(res.data['avis']['note'], 4)

    def test_anonymous_rejected(self):
        self.assertEqual(self.client.get(f'/api/interventions/{self.pending.id}/').status_code, 401)


class DashboardTests(BaseInterventionTest):
    def test_client_dashboard_is_scoped(self):
        self.client.force_authenticate(self.client_a)
        res = self.client.get('/api/interventions/dashboard/')
        self.assertEqual(res.status_code, 200)
        self.assertEqual(res.data['total'], 2)
        self.assertEqual(res.data['par_statut']['EN_ATTENTE'], 1)
        self.assertEqual(res.data['par_statut']['TERMINEE'], 0)
        self.assertEqual(len(res.data['par_mois']), 6)
        self.assertNotIn('par_technicien', res.data)
        self.assertNotIn('utilisateurs', res.data)

    def test_technician_dashboard(self):
        self.client.force_authenticate(self.tech)
        res = self.client.get('/api/interventions/dashboard/')
        self.assertEqual(res.data['total'], 2)
        self.assertEqual(res.data['note_moyenne'], 4.0)
        self.assertEqual(res.data['temps_moyen_resolution_heures'], 2.0)
        self.assertEqual(res.data['prevues_aujourdhui'], 1)

    def test_responsable_dashboard_has_team_kpis(self):
        self.client.force_authenticate(self.resp)
        res = self.client.get('/api/interventions/dashboard/')
        self.assertEqual(res.data['total'], 3)
        self.assertEqual(res.data['urgentes_ouvertes'], 1)
        self.assertEqual(res.data['taux_resolution'], 33)
        self.assertEqual(res.data['techniciens']['total'], 2)
        self.assertEqual(res.data['par_technicien'][0]['total'], 2)
        self.assertNotIn('utilisateurs', res.data)

    def test_admin_dashboard_has_users(self):
        self.client.force_authenticate(self.admin)
        res = self.client.get('/api/interventions/dashboard/')
        self.assertEqual(res.data['utilisateurs']['total'], 6)
        self.assertEqual(res.data['utilisateurs']['par_role']['CLIENT'], 2)


class CalendarTests(BaseInterventionTest):
    def test_calendar_includes_done_at_closing_date(self):
        self.client.force_authenticate(self.resp)
        today = timezone.localdate()
        res = self.client.get('/api/interventions/calendar/', {
            'start': (today - timedelta(days=1)).isoformat(), 'end': today.isoformat(),
        })
        self.assertEqual(res.status_code, 200)
        row = next(r for r in res.data if r['technicien']['id'] == self.tech.id)
        ids = {i['id']: i['date_calendrier'] for i in row['interventions']}
        # terminée : placée à sa date de clôture (aujourd'hui ou la veille selon l'heure), pas à la date souhaitée
        self.assertIn(self.done.id, ids)
        self.assertIn(self.assigned.id, ids)
        self.assertNotIn(self.pending.id, ids)

    def test_calendar_forbidden_for_client(self):
        self.client.force_authenticate(self.client_a)
        self.assertEqual(self.client.get('/api/interventions/calendar/').status_code, 403)


class AIDescriptionTests(BaseInterventionTest):
    def test_fallback_when_ai_unavailable(self):
        from unittest.mock import patch
        from .services.ai_agent import AIAgentError

        self.client.force_authenticate(self.client_a)
        with patch('interventions.views.generate_intervention_description',
                   side_effect=AIAgentError('Quota épuisé')):
            res = self.client.post('/api/interventions/generate-description/',
                                   {'type_panne': 'Logiciel en panne'}, format='json')
        self.assertEqual(res.status_code, 200)
        self.assertEqual(res.data['source'], 'modele')
        self.assertIn('Logiciel en panne', res.data['description'])
        self.assertEqual(res.data['detail'], 'Quota épuisé')

    def test_ai_success(self):
        from unittest.mock import patch

        self.client.force_authenticate(self.client_a)
        with patch('interventions.views.generate_intervention_description', return_value='Texte IA'):
            res = self.client.post('/api/interventions/generate-description/',
                                   {'type_panne': 'Clim'}, format='json')
        self.assertEqual(res.data, {'description': 'Texte IA', 'source': 'ia'})

    def test_missing_api_key_raises_clear_error(self):
        from django.test import override_settings
        from .services.ai_agent import AIAgentError, generate_intervention_description

        with override_settings(GEMINI_API_KEY=''):
            with self.assertRaisesMessage(AIAgentError, 'GEMINI_API_KEY'):
                generate_intervention_description('Clim')


class AIModelSelectionTests(BaseInterventionTest):
    """Simule un compte Google où les anciens modèles ont été retirés."""

    def _fake_client(self, available, listed=()):
        from types import SimpleNamespace
        from google.genai import errors as genai_errors

        calls = []

        def generate_content(model, contents):
            calls.append(model)
            if model in available:
                return SimpleNamespace(text=f'Description par {model}')
            raise genai_errors.APIError(404, {'error': {
                'code': 404, 'status': 'NOT_FOUND',
                'message': f'This model models/{model} is no longer available. Please update your code '
                           'to use models/gemini-3.8-flash for the latest features and improvements. '
                           'We recommend you to use the Interactions API.',
            }})

        models = SimpleNamespace(
            generate_content=generate_content,
            list=lambda: [SimpleNamespace(name=f'models/{n}', supported_actions=['generateContent']) for n in listed],
        )
        return SimpleNamespace(models=models), calls

    def _run(self, client, model_setting):
        from unittest.mock import patch
        from django.test import override_settings
        from .services import ai_agent

        ai_agent._working_model = None
        with override_settings(GEMINI_API_KEY='k', GEMINI_MODEL=model_setting), \
                patch.object(ai_agent, 'FALLBACK_MODELS', ['gemini-2.0-flash']), \
                patch.object(ai_agent.genai, 'Client', return_value=client):
            return ai_agent.generate_intervention_description('Logiciel en panne')

    def test_uses_model_suggested_in_404_message(self):
        client, calls = self._fake_client(available={'gemini-3.8-flash'})
        self.assertEqual(self._run(client, 'gemini-old'), 'Description par gemini-3.8-flash')
        self.assertEqual(calls[-1], 'gemini-3.8-flash')

    def test_discovers_model_from_list(self):
        client, calls = self._fake_client(
            available={'gemini-4.0-flash'},
            listed=['gemini-1.5-flash', 'gemini-4.0-flash', 'gemini-4.0-flash-image'],
        )
        self.assertEqual(self._run(client, 'gemini-old'), 'Description par gemini-4.0-flash')

    def test_remembers_working_model(self):
        from .services import ai_agent

        client, calls = self._fake_client(available={'gemini-3.8-flash'})
        self._run(client, 'gemini-old')
        self.assertEqual(ai_agent._working_model, 'gemini-3.8-flash')


class DateSouhaiteeValidationTests(BaseInterventionTest):
    def _create(self, date_souhaitee):
        self.client.force_authenticate(self.client_a)
        return self.client.post('/api/interventions/create/', {
            'type_panne': 'Clim', 'description': 'd', 'priorite': 'NORMALE',
            'date_souhaitee': date_souhaitee,
        }, format='json')

    def test_today_rejected(self):
        res = self._create(timezone.localdate().isoformat())
        self.assertEqual(res.status_code, 400)
        self.assertIn('date_souhaitee', res.data)

    def test_past_rejected(self):
        res = self._create((timezone.localdate() - timedelta(days=3)).isoformat())
        self.assertEqual(res.status_code, 400)

    def test_tomorrow_accepted(self):
        res = self._create((timezone.localdate() + timedelta(days=1)).isoformat())
        self.assertEqual(res.status_code, 201)

    def test_no_date_accepted(self):
        res = self._create(None)
        self.assertEqual(res.status_code, 201)
