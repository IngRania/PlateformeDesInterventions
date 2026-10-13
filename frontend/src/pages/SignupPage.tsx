import { useState } from 'react';
import { Row, Col, Form, Button, Alert, Spinner } from 'react-bootstrap';
import { useNavigate, Link } from 'react-router-dom';
import api from '../api/axios';
import AuthLayout from '../components/AuthLayout';

export default function SignupPage() {
  const navigate = useNavigate();
  const [form, setForm] = useState({
    email: '', first_name: '', last_name: '', phone: '', password: '', password2: '',
  });
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (form.password !== form.password2) {
      setError('Les deux mots de passe ne correspondent pas.');
      return;
    }

    setLoading(true);
    try {
      await api.post('/auth/signup/', form);
      navigate('/login');
    } catch (err: any) {
      const data = err.response?.data;
      const firstError = data ? Object.values(data)[0] : null;
      setError(Array.isArray(firstError) ? firstError[0] : "Erreur lors de l'inscription.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthLayout
      brandTitle="Créez votre compte"
      brandSubtitle="Déposez vos demandes d'intervention et suivez leur avancement en toute simplicité."
    >
      <div className="mb-4">
        <h2 className="auth-title">Créer un compte</h2>
        <p className="auth-subtitle">Inscrivez-vous en tant que client</p>
      </div>

      {error && <Alert variant="danger">{error}</Alert>}

      <Form onSubmit={handleSubmit}>
        <Row>
          <Col sm={6}>
            <Form.Group className="mb-3">
              <Form.Label>Prénom</Form.Label>
              <Form.Control
                name="first_name"
                autoComplete="given-name"
                value={form.first_name}
                onChange={handleChange}
                required
              />
            </Form.Group>
          </Col>
          <Col sm={6}>
            <Form.Group className="mb-3">
              <Form.Label>Nom</Form.Label>
              <Form.Control
                name="last_name"
                autoComplete="family-name"
                value={form.last_name}
                onChange={handleChange}
                required
              />
            </Form.Group>
          </Col>
        </Row>

        <Form.Group className="mb-3">
          <Form.Label>Email</Form.Label>
          <Form.Control
            type="email"
            name="email"
            placeholder="nom@exemple.com"
            autoComplete="email"
            value={form.email}
            onChange={handleChange}
            required
          />
        </Form.Group>

        <Form.Group className="mb-3">
          <Form.Label>Téléphone</Form.Label>
          <Form.Control
            type="tel"
            name="phone"
            autoComplete="tel"
            value={form.phone}
            onChange={handleChange}
          />
        </Form.Group>

        <Row>
          <Col sm={6}>
            <Form.Group className="mb-4">
              <Form.Label>Mot de passe</Form.Label>
              <Form.Control
                type="password"
                name="password"
                autoComplete="new-password"
                value={form.password}
                onChange={handleChange}
                required
              />
            </Form.Group>
          </Col>
          <Col sm={6}>
            <Form.Group className="mb-4">
              <Form.Label>Confirmer</Form.Label>
              <Form.Control
                type="password"
                name="password2"
                autoComplete="new-password"
                value={form.password2}
                onChange={handleChange}
                required
              />
            </Form.Group>
          </Col>
        </Row>

        <div className="d-grid">
          <Button variant="primary" type="submit" disabled={loading}>
            {loading ? <Spinner size="sm" animation="border" /> : "S'inscrire"}
          </Button>
        </div>
      </Form>

      <div className="text-center mt-4">
        <span className="text-muted">Déjà un compte ? </span>
        <Link to="/login">Se connecter</Link>
      </div>
    </AuthLayout>
  );
}