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
