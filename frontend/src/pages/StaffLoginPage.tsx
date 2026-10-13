import { useState } from 'react';
import { Form, Button, Alert, Spinner } from 'react-bootstrap';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import AuthLayout from '../components/AuthLayout';

const roleRedirect: Record<string, string> = {
  TECHNICIEN: '/technicien/mes-taches',
  RESPONSABLE: '/responsable/interventions',
};

export default function StaffLoginPage() {
  const { login, loading, error } = useAuth();
  const navigate = useNavigate();
  const [matricule, setMatricule] = useState('');
  const [password, setPassword] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await login(matricule, password);
      const savedUser = JSON.parse(localStorage.getItem('user') || '{}');
      if (savedUser.must_change_password) {
        navigate('/change-password');
      } else {
        navigate(roleRedirect[savedUser.role] || '/login');
      }
    } catch {
      // erreur déjà affichée via le contexte
    }
  };

  return (
    <AuthLayout
      brandTitle="Espace Personnel"
      brandSubtitle="Techniciens et Responsables, connectez-vous avec votre matricule pour accéder à vos missions."
    >
      <div className="mb-4">
        <h2 className="auth-title">Connexion Technicien / Responsable</h2>
        <p className="auth-subtitle">Connectez-vous avec votre matricule</p>
      </div>

      {error && <Alert variant="danger">{error}</Alert>}

      <Form onSubmit={handleSubmit}>
        <Form.Group className="mb-3">
          <Form.Label>Matricule</Form.Label>
          <Form.Control
            type="text"
            placeholder="Ex: T0001 ou R0001"
            value={matricule}
            onChange={(e) => setMatricule(e.target.value)}
            required
          />
          <Form.Text className="text-muted">
            Reçu par email lors de la création de votre compte.
          </Form.Text>
        </Form.Group>

        <Form.Group className="mb-4">
          <Form.Label>Mot de passe</Form.Label>
          <Form.Control
            type="password"
            placeholder="••••••••"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
        </Form.Group>

        <Button type="submit" variant="primary" className="w-100 auth-submit-btn" disabled={loading}>
          {loading ? <Spinner size="sm" animation="border" /> : 'Se connecter'}
        </Button>
      </Form>

      <div className="text-center mt-3">
        <Link to="/forgot-password" className="text-muted small">Mot de passe oublié ?</Link>
      </div>

      
    </AuthLayout>
  );
}