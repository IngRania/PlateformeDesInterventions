import { useState } from 'react';
import { Container, Row, Col, Card, Form, Button, Alert, Spinner, Navbar, InputGroup } from 'react-bootstrap';
import {
  Wrench, ShieldLockFill, LockFill, KeyFill,
  ExclamationCircleFill, CheckCircleFill,
} from 'react-bootstrap-icons';
import { useNavigate } from 'react-router-dom';
import api from '../api/axios';
import { useAuth } from '../context/AuthContext';

export default function ChangePasswordPage() {
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const [form, setForm] = useState({ old_password: '', new_password: '', new_password2: '' });
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    // On détermine la bonne page de login AVANT de vider le contexte utilisateur.
    const isStaff = user?.role === 'TECHNICIEN' || user?.role === 'RESPONSABLE';
    const redirectPath = isStaff ? '/staff-login' : '/login';

    try {
      await api.post('/auth/change-password/', form);
      setSuccess(true);
      setTimeout(() => {
        logout();
        navigate(redirectPath);
      }, 1500);
    } catch (err: any) {
      const data = err.response?.data;
      const firstError = data ? Object.values(data)[0] : null;
      setError(Array.isArray(firstError) ? firstError[0] : 'Erreur lors du changement.');
    } finally {
      setLoading(false);
    }
  };

  return (
  <div className="profile-page">
    <Navbar className="profile-navbar px-4 py-3" variant="dark">
      <Navbar.Brand className="fw-bold d-flex align-items-center gap-2">
        <span className="brand-icon"><Wrench size={20} /></span>
        Mon espace
      </Navbar.Brand>
    </Navbar>

    <Container className="py-5 position-relative" style={{ zIndex: 1 }}>
      <Row className="justify-content-center">
        <Col xs={12} md={9} lg={7} xl={5}>
          <Card className="profile-card">
            {/* ===== Bandeau ===== */}
            <div className="profile-header">
              <div className="pwd-header-icon">
                <ShieldLockFill size={34} />
              </div>
              <div className="profile-header-info">
                <h4 className="profile-name">Changer le mot de passe</h4>
                <small className="profile-hint">Requis avant de continuer</small>
              </div>
            </div>

            {/* ===== Corps ===== */}
            <Card.Body className="p-4">
              {error && (
                <Alert variant="danger" className="profile-alert alert-error" dismissible onClose={() => setError(null)}>
                  <ExclamationCircleFill className="alert-icon" />{error}
                </Alert>
              )}
              {success && (
                <Alert variant="success" className="profile-alert alert-ok">
                  <CheckCircleFill className="alert-icon" />Mot de passe modifié ! Reconnexion...
                </Alert>
              )}

              <Form onSubmit={handleSubmit}>
                <Form.Group className="mb-3">
                  <Form.Label>Ancien mot de passe</Form.Label>
                  <InputGroup className="profile-input">
                    <InputGroup.Text><LockFill /></InputGroup.Text>
                    <Form.Control
                      type="password"
                      name="old_password"
                      value={form.old_password}
                      onChange={handleChange}
                      required
                    />
                  </InputGroup>
                </Form.Group>

                <Form.Group className="mb-3">
                  <Form.Label>Nouveau mot de passe</Form.Label>
                  <InputGroup className="profile-input">
                    <InputGroup.Text><KeyFill /></InputGroup.Text>
                    <Form.Control
                      type="password"
                      name="new_password"
                      value={form.new_password}
                      onChange={handleChange}
                      required
                    />
                  </InputGroup>
                </Form.Group>

                <Form.Group className="mb-4">
                  <Form.Label>Confirmer le nouveau mot de passe</Form.Label>
                  <InputGroup className="profile-input">
                    <InputGroup.Text><KeyFill /></InputGroup.Text>
                    <Form.Control
                      type="password"
                      name="new_password2"
                      value={form.new_password2}
                      onChange={handleChange}
                      required
                    />
                  </InputGroup>
                </Form.Group>

                <Button type="submit" className="btn-main w-100" disabled={loading}>
                  {loading ? <Spinner size="sm" animation="border" /> : 'Valider'}
                </Button>
              </Form>
            </Card.Body>
          </Card>
        </Col>
      </Row>
    </Container>
  </div>
);
}