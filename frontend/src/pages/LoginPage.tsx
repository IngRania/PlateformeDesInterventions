import { useEffect, useState } from 'react';
import { Form, Button, Alert, Spinner, InputGroup } from 'react-bootstrap';
import { useNavigate, Link } from 'react-router-dom';
import { Eye, EyeSlash, PersonFill, LockFill } from 'react-bootstrap-icons';
import { useAuth } from '../context/AuthContext';
import AuthLayout from '../components/AuthLayout';
import { clearActiveSpace } from '../config/spaces';

export default function LoginPage() {
  const { user, login, loading, error } = useAuth();
  const navigate = useNavigate();
  const [identifiant, setIdentifiant] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  // Déjà connecté : on passe directement au choix de l'espace.
  useEffect(() => {
    if (user && !user.must_change_password) navigate('/choisir-espace', { replace: true });
  }, [user, navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await login(identifiant.trim(), password);
      clearActiveSpace();
      const savedUser = JSON.parse(localStorage.getItem('user') || '{}');
      navigate(savedUser.must_change_password ? '/change-password' : '/choisir-espace');
    } catch {
      // erreur déjà affichée via le contexte
    }
  };

  return (
    <AuthLayout
      brandTitle="La maintenance, simplement."
      brandSubtitle="Une seule connexion pour les clients, techniciens, responsables maintenance et administrateurs."
    >
      <div className="mb-4">
        <h2 className="auth-title">Connexion</h2>
        <p className="auth-subtitle">Identifiez-vous, puis choisissez votre espace de travail.</p>
      </div>

      {error && <Alert variant="danger">{error}</Alert>}

      <Form onSubmit={handleSubmit}>
        <Form.Group className="mb-3" controlId="identifiant">
          <Form.Label>Email ou matricule</Form.Label>
          <InputGroup>
            <InputGroup.Text><PersonFill /></InputGroup.Text>
            <Form.Control
              type="text"
              autoComplete="username"
              placeholder="nom@exemple.com ou T0001"
              value={identifiant}
              onChange={(e) => setIdentifiant(e.target.value)}
              required
              autoFocus
            />
          </InputGroup>
          <Form.Text>
            Clients et administrateurs : email. Techniciens et responsables : matricule.
          </Form.Text>
        </Form.Group>

        <Form.Group className="mb-2" controlId="password">
          <Form.Label>Mot de passe</Form.Label>
          <InputGroup>
            <InputGroup.Text><LockFill /></InputGroup.Text>
            <Form.Control
              type={showPassword ? 'text' : 'password'}
              autoComplete="current-password"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
            <Button
              variant="outline-secondary"
              className="input-addon-btn"
              onClick={() => setShowPassword((v) => !v)}
              aria-label={showPassword ? 'Masquer le mot de passe' : 'Afficher le mot de passe'}
            >
              {showPassword ? <EyeSlash /> : <Eye />}
            </Button>
          </InputGroup>
        </Form.Group>

        <div className="text-end mb-4">
          <Link to="/forgot-password" className="small">Mot de passe oublié ?</Link>
        </div>

        <Button type="submit" variant="primary" className="w-100" disabled={loading}>
          {loading ? <Spinner size="sm" animation="border" /> : 'Se connecter'}
        </Button>
      </Form>

      <div className="auth-divider"><span>Nouveau client ?</span></div>

      <Link to="/signup" className="btn btn-outline-primary w-100">Créer un compte client</Link>
    </AuthLayout>
  );
}
