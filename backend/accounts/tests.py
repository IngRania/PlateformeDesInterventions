from django.contrib.auth import get_user_model
from rest_framework.test import APITestCase

User = get_user_model()


class UserActivationTests(APITestCase):
    @classmethod
    def setUpTestData(cls):
        cls.admin = User.objects.create_user('admin@test.tn', 'pass', role='ADMIN')
        cls.resp = User.objects.create_user('resp@test.tn', 'pass', role='RESPONSABLE', matricule='R0001')
        cls.target = User.objects.create_user('c@test.tn', 'pass', role='CLIENT')

    def test_admin_can_deactivate_and_reactivate(self):
        self.client.force_authenticate(self.admin)
        res = self.client.patch(f'/api/auth/users/{self.target.id}/', {'is_active': False}, format='json')
        self.assertEqual(res.status_code, 200)
        self.target.refresh_from_db()
        self.assertFalse(self.target.is_active)
        self.client.patch(f'/api/auth/users/{self.target.id}/', {'is_active': True}, format='json')
        self.target.refresh_from_db()
        self.assertTrue(self.target.is_active)

    def test_admin_cannot_deactivate_self(self):
        self.client.force_authenticate(self.admin)
        res = self.client.patch(f'/api/auth/users/{self.admin.id}/', {'is_active': False}, format='json')
        self.assertEqual(res.status_code, 400)

    def test_non_admin_forbidden(self):
        self.client.force_authenticate(self.resp)
        res = self.client.patch(f'/api/auth/users/{self.target.id}/', {'is_active': False}, format='json')
        self.assertEqual(res.status_code, 403)

    def test_requires_boolean(self):
        self.client.force_authenticate(self.admin)
        res = self.client.patch(f'/api/auth/users/{self.target.id}/', {'is_active': 'no'}, format='json')
        self.assertEqual(res.status_code, 400)
