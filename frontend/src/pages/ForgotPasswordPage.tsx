import { useState } from 'react';
import { Form, Button, Alert, Spinner } from 'react-bootstrap';
import { useNavigate, Link } from 'react-router-dom';
import api from '../api/axios';
import AuthLayout from '../components/AuthLayout';

export default function ForgotPasswordPage() {
  const navigate = useNavigate();
  const [step, setStep] = useState<1 | 2>(1);

  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [newPassword2, setNewPassword2] = useState('');

  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleRequestCode = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      await api.post('/auth/forgot-password/', { email });
      setInfo('Un code de vérification a été envoyé à cet email.');
      setStep(2);
    } catch (err: any) {
      const data = err.response?.data;
      const firstError = data ? Object.values(data)[0] : null;
      setError(Array.isArray(firstError) ? firstError[0] : 'Erreur, vérifiez l\'email saisi.');
    } finally {
      setLoading(false);
    }
  };

  const handleReset = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      await api.post('/auth/reset-password/', {
        email,
        code,
        new_password: newPassword,
        new_password2: newPassword2,
      });
      setInfo('Mot de passe réinitialisé ! Vous pouvez vous connecter.');
      setTimeout(() => navigate('/login'), 1800);
    } catch (err: any) {
      const data = err.response?.data;
      const firstError = data ? Object.values(data)[0] : null;
      setError(Array.isArray(firstError) ? firstError[0] : 'Code invalide ou expiré.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthLayout
      brandTitle="Mot de passe oublié"
      brandSubtitle="Recevez un code de vérification par email pour réinitialiser votre mot de passe en toute sécurité."
    >
      <div className="mb-4">
        <h2 className="auth-title">Réinitialisation</h2>
        <p className="auth-subtitle">
          {step === 1 ? 'Étape 1 : votre email' : 'Étape 2 : code reçu par email'}
        </p>
      </div>

      {error && <Alert variant="danger">{error}</Alert>}
      {info && <Alert variant="success">{info}</Alert>}

      {step === 1 ? (
        <Form onSubmit={handleRequestCode}>
          <Form.Group className="mb-4">
            <Form.Label>Email</Form.Label>
            <Form.Control
              type="email"
              placeholder="Ex: client1@test.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
            <Form.Text className="text-muted">
              L'email associé à votre compte.
            </Form.Text>
          </Form.Group>

          <Button type="submit" variant="primary" className="w-100 auth-submit-btn" disabled={loading}>
            {loading ? <Spinner size="sm" animation="border" /> : 'Envoyer le code'}
          </Button>
        </Form>
      ) : (
        <Form onSubmit={handleReset}>
          <Form.Group className="mb-3">
            <Form.Label>Code reçu par email</Form.Label>
            <Form.Control
              type="text"
              maxLength={6}
              placeholder="123456"
              value={code}
              onChange={(e) => setCode(e.target.value)}
              required
            />
          </Form.Group>

          <Form.Group className="mb-3">
            <Form.Label>Nouveau mot de passe</Form.Label>
            <Form.Control
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              required
            />
          </Form.Group>

          <Form.Group className="mb-4">
            <Form.Label>Confirmer le nouveau mot de passe</Form.Label>
            <Form.Control
              type="password"
              value={newPassword2}
              onChange={(e) => setNewPassword2(e.target.value)}
              required
            />
          </Form.Group>

          <Button type="submit" variant="primary" className="w-100 auth-submit-btn" disabled={loading}>
            {loading ? <Spinner size="sm" animation="border" /> : 'Réinitialiser le mot de passe'}
          </Button>

          <div className="text-center mt-3">
            <Button variant="link" size="sm" onClick={() => setStep(1)}>
              Renvoyer un code
            </Button>
          </div>
        </Form>
      )}

      <div className="text-center mt-3">
        <Link to="/login" className="text-muted small">Retour à la connexion</Link>
      </div>
    </AuthLayout>
  );
}