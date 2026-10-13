from django.contrib.auth import get_user_model
from rest_framework.test import APITestCase

from interventions.models import Intervention, StatutIntervention

from .models import TechnicianLocation

User = get_user_model()


class TrackingApiTests(APITestCase):
    @classmethod
    def setUpTestData(cls):
        cls.resp = User.objects.create_user('resp@test.tn', 'pass', role='RESPONSABLE', matricule='R0001')
        cls.tech = User.objects.create_user('tech@test.tn', 'pass', role='TECHNICIEN', matricule='T0001')
        cls.client_user = User.objects.create_user('c@test.tn', 'pass', role='CLIENT')

    def test_technician_posts_and_reads_position(self):
        self.client.force_authenticate(self.tech)
        res = self.client.post('/api/tracking/me/', {'latitude': 36.8, 'longitude': 10.18}, format='json')
        self.assertEqual(res.status_code, 200)
        self.assertEqual(TechnicianLocation.objects.get(technicien=self.tech).latitude, 36.8)
        self.client.post('/api/tracking/me/', {'latitude': 36.9, 'longitude': 10.2}, format='json')
        self.assertEqual(TechnicianLocation.objects.count(), 1)
        self.assertEqual(self.client.get('/api/tracking/me/').data['latitude'], 36.9)

    def test_invalid_coordinates_rejected(self):
        self.client.force_authenticate(self.tech)
        res = self.client.post('/api/tracking/me/', {'latitude': 120, 'longitude': 10}, format='json')
        self.assertEqual(res.status_code, 400)

    def test_only_technicians_post(self):
        self.client.force_authenticate(self.resp)
        res = self.client.post('/api/tracking/me/', {'latitude': 1, 'longitude': 1}, format='json')
        self.assertEqual(res.status_code, 403)

    def test_list_restricted_to_staff_and_shows_current_intervention(self):
        TechnicianLocation.objects.create(technicien=self.tech, latitude=1, longitude=2)
        intervention = Intervention.objects.create(
            client=self.client_user, type_panne='Clim', description='d',
            technicien=self.tech, statut=StatutIntervention.EN_COURS,
        )
        self.client.force_authenticate(self.client_user)
        self.assertEqual(self.client.get('/api/tracking/locations/').status_code, 403)

        self.client.force_authenticate(self.resp)
        res = self.client.get('/api/tracking/locations/')
        self.assertEqual(res.status_code, 200)
        self.assertEqual(res.data[0]['technicien_matricule'], 'T0001')
        self.assertEqual(res.data[0]['intervention_en_cours']['id'], intervention.id)

    def test_me_without_position_returns_empty_200(self):
        self.client.force_authenticate(self.tech)
        res = self.client.get('/api/tracking/me/')
        self.assertEqual(res.status_code, 200)
        self.assertIsNone(res.data)
