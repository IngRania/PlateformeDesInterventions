import { useState } from 'react';
import { Form, Button, Alert, Spinner } from 'react-bootstrap';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import AuthLayout from '../components/AuthLayout';

const roleRedirect: Record<string, string> = {
  ADMIN: '/admin/dashboard',
  CLIENT: '/client/dashboard',
};

export default function ClientLoginPage() {
  const { login, loading, error } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await login(email, password);
      const savedUser = JSON.parse(localStorage.getItem('user') || '{}');
      if (savedUser.must_change_password) {
        navigate('/change-password');
      } else {
        navigate(roleRedirect[savedUser.role] || '/client/dashboard');
      }
    } catch {
      // erreur déjà affichée via le contexte
    }
  };

  return (
    <AuthLayout
      brandTitle="Bienvenue"
      brandSubtitle="Connectez-vous pour suivre vos interventions techniques en toute simplicité."
    >
      <div className="mb-4">
        <h2 className="auth-title">Connexion Client</h2>
        <p className="auth-subtitle">Accédez à votre espace</p>
      </div>

      {error && <Alert variant="danger">{error}</Alert>}

      <Form onSubmit={handleSubmit}>
        <Form.Group className="mb-3">
          <Form.Label>Email</Form.Label>
          <Form.Control
            type="email"
            placeholder="nom@exemple.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
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

        <div className="d-grid">
          <Button variant="primary" type="submit" disabled={loading}>
            {loading ? <Spinner size="sm" animation="border" /> : 'Se connecter'}
          </Button>
        </div>
      </Form>

      <div className="text-center mt-3">
        <Link to="/forgot-password" className="text-muted small">Mot de passe oublié ?</Link>
      </div>

      <div className="text-center mt-4">
        <span className="text-muted">Pas encore de compte ? </span>
        <Link to="/signup">Créer un compte</Link>
      </div>
    </AuthLayout>
  );
}