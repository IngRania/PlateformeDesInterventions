import { useState, useRef } from 'react';
import { Container, Row, Col, Card, Form, Button, Alert, Spinner, Badge, Navbar, InputGroup } from 'react-bootstrap';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import api from '../api/axios';
import {
  Wrench, BoxArrowRight, CameraFill, Envelope, Person, Telephone,
  Pencil, LockFill, ExclamationCircleFill, CheckCircleFill,
} from 'react-bootstrap-icons';

const roleLabels: Record<string, string> = {
  ADMIN: 'Administrateur',
  RESPONSABLE: 'Responsable',
  TECHNICIEN: 'Technicien',
  CLIENT: 'Client',
};

export default function ProfilePage() {
  const { user, logout, setUser } = useAuth();
  const navigate = useNavigate();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState({
    first_name: user?.first_name || '',
    last_name: user?.last_name || '',
    phone: user?.phone || '',
  });
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);
  const [avatarLoading, setAvatarLoading] = useState(false);

  if (!user) return null;

  const initials = `${user.first_name?.[0] || ''}${user.last_name?.[0] || ''}`.toUpperCase();

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(false);
    setLoading(true);
    try {
      const res = await api.patch('/auth/me/', form);
      const updatedUser = { ...user, ...res.data };
      setUser(updatedUser);
      localStorage.setItem('user', JSON.stringify(updatedUser));
      setSuccess(true);
      setEditing(false);
    } catch (err: any) {
      setError('Erreur lors de la mise à jour du profil.');
    } finally {
      setLoading(false);
    }
  };

  const handleAvatarClick = () => {
    fileInputRef.current?.click();
  };

  const handleAvatarChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setError(null);
    setAvatarLoading(true);
    const formData = new FormData();
    formData.append('avatar', file);

    try {
      const res = await api.post('/auth/avatar/', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      const updatedUser = { ...user, ...res.data };
      setUser(updatedUser);
      localStorage.setItem('user', JSON.stringify(updatedUser));
    } catch (err: any) {
      setError("Erreur lors de l'envoi de la photo de profil.");
    } finally {
      setAvatarLoading(false);
    }
  };

  const handleLogout = () => {
    const isStaff = user.role === 'TECHNICIEN' || user.role === 'RESPONSABLE';
    logout();
    navigate(isStaff ? '/staff-login' : '/login');
  };

 return (
  <div className="profile-page">
    <Navbar className="profile-navbar px-4 py-3" variant="dark">
      <Navbar.Brand className="fw-bold d-flex align-items-center gap-2">
        <span className="brand-icon"><Wrench size={20} /></span>
        Mon espace
      </Navbar.Brand>
      <div className="ms-auto">
        <Button variant="outline-light" size="sm" className="logout-btn" onClick={handleLogout}>
          <BoxArrowRight className="me-2" />Déconnexion
        </Button>
      </div>
    </Navbar>

    <Container className="py-5 position-relative" style={{ zIndex: 1 }}>
      <Row className="justify-content-center">
        <Col xs={12} md={9} lg={7} xl={6}>
          <Card className="profile-card">
            {/* ===== Bandeau ===== */}
            <div className="profile-header">
              <div
                className="profile-avatar-wrapper"
                onClick={handleAvatarClick}
                title="Cliquez pour changer la photo"
              >
                {user.avatar_url ? (
                  <img src={user.avatar_url} alt="avatar" className="profile-avatar-img" />
                ) : (
                  <div className="profile-avatar">{initials || '?'}</div>
                )}
                {avatarLoading && (
                  <div className="avatar-overlay">
                    <Spinner size="sm" animation="border" variant="light" />
                  </div>
                )}
                <span className="avatar-camera"><CameraFill size={12} /></span>
              </div>
              <input
                type="file"
                accept="image/*"
                ref={fileInputRef}
                onChange={handleAvatarChange}
                style={{ display: 'none' }}
              />
              <div className="profile-header-info">
                <h4 className="profile-name">{user.first_name} {user.last_name}</h4>
                <div className="d-flex gap-2 flex-wrap mb-2">
                  <Badge className="role-badge role-badge-main">{roleLabels[user.role]}</Badge>
                  {user.matricule && (
                    <Badge className="role-badge role-badge-matricule">{user.matricule}</Badge>
                  )}
                </div>
                <small className="profile-hint">Cliquez sur la photo pour la changer</small>
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
                <Alert variant="success" className="profile-alert alert-ok" dismissible onClose={() => setSuccess(false)}>
                  <CheckCircleFill className="alert-icon" />Profil mis à jour avec succès.
                </Alert>
              )}

              <Form onSubmit={handleSave}>
                <Form.Group className="mb-3">
                  <Form.Label>Email</Form.Label>
                  <InputGroup className="profile-input">
                    <InputGroup.Text><Envelope /></InputGroup.Text>
                    <Form.Control value={user.email} disabled />
                  </InputGroup>
                </Form.Group>

                {user.matricule && (
                  <Form.Group className="mb-3">
                    <Form.Label>
                      Matricule <span className="label-muted">(identifiant de connexion)</span>
                    </Form.Label>
                    <InputGroup className="profile-input">
                      <InputGroup.Text><Person /></InputGroup.Text>
                      <Form.Control value={user.matricule} disabled />
                    </InputGroup>
                  </Form.Group>
                )}

                <Row>
                  <Col md={6}>
                    <Form.Group className="mb-3">
                      <Form.Label>Prénom</Form.Label>
                      <InputGroup className="profile-input">
                        <InputGroup.Text><Person /></InputGroup.Text>
                        <Form.Control name="first_name" value={form.first_name} onChange={handleChange} disabled={!editing} />
                      </InputGroup>
                    </Form.Group>
                  </Col>
                  <Col md={6}>
                    <Form.Group className="mb-3">
                      <Form.Label>Nom</Form.Label>
                      <InputGroup className="profile-input">
                        <InputGroup.Text><Person /></InputGroup.Text>
                        <Form.Control name="last_name" value={form.last_name} onChange={handleChange} disabled={!editing} />
                      </InputGroup>
                    </Form.Group>
                  </Col>
                </Row>

                <Form.Group className="mb-4">
                  <Form.Label>Téléphone</Form.Label>
                  <InputGroup className="profile-input">
                    <InputGroup.Text><Telephone /></InputGroup.Text>
                    <Form.Control name="phone" value={form.phone} onChange={handleChange} disabled={!editing} />
                  </InputGroup>
                </Form.Group>

                <div className="d-flex gap-2 flex-wrap">
                  {!editing ? (
                    <Button className="btn-main" type="button" onClick={() => setEditing(true)}>
                      <Pencil className="me-2" />Modifier mes informations
                    </Button>
                  ) : (
                    <>
                      <Button className="btn-main" type="submit" disabled={loading}>
                        {loading ? <Spinner size="sm" animation="border" /> : 'Enregistrer'}
                      </Button>
                      <Button variant="outline-secondary" className="btn-soft" type="button" onClick={() => setEditing(false)}>
                        Annuler
                      </Button>
                    </>
                  )}
                  <Button
                    variant="outline-danger"
                    type="button"
                    className="ms-auto btn-soft btn-pwd"
                    onClick={() => navigate('/change-password')}
                  >
                    <LockFill className="me-2" />Changer le mot de passe
                  </Button>
                </div>
              </Form>
            </Card.Body>
          </Card>
        </Col>
      </Row>
    </Container>
  </div>
);
}