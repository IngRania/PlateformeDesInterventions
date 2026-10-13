import { useState } from 'react';
import { Container, Row, Col, Card, Form, Button, Alert, Spinner, Navbar } from 'react-bootstrap';
import { useNavigate } from 'react-router-dom';
import { createIntervention, generateDescription } from '../../api/interventions';
import { useAuth } from '../../context/AuthContext';

export default function NewInterventionPage() {
  const navigate = useNavigate();
  const { logout } = useAuth();
  const [form, setForm] = useState({
    type_panne: '', description: '', priorite: 'NORMALE', date_souhaitee: '',
  });
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [genError, setGenError] = useState<string | null>(null);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };
  const handleSelectChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setForm({ ...form, priorite: e.target.value });
  };

  const handleGenerateDescription = async () => {
    if (!form.type_panne.trim()) {
      setGenError("Renseignez d'abord le type de panne / besoin.");
      return;
    }
    setGenError(null);
    setGenerating(true);
    try {
      const description = await generateDescription(form.type_panne);
      setForm((prev) => ({ ...prev, description }));
    } catch (err) {
      setGenError("Impossible de générer une description pour l'instant. Vous pouvez la rédiger manuellement.");
    } finally {
      setGenerating(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      await createIntervention({
        ...form,
        date_souhaitee: form.date_souhaitee || null,
      });
      setSuccess(true);
      setForm({ type_panne: '', description: '', priorite: 'NORMALE', date_souhaitee: '' });
      setTimeout(() => navigate('/client/mes-interventions'), 1200);
    } catch (err: any) {
      const data = err.response?.data;
      const firstError = data ? Object.values(data)[0] : null;
      setError(Array.isArray(firstError) ? firstError[0] : "Erreur lors de l'envoi de la demande.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <Navbar className="px-4 py-3" bg="primary" variant="dark">
        <Navbar.Brand className="fw-bold">Espace Client</Navbar.Brand>
        <div className="ms-auto d-flex gap-2">
          <Button variant="outline-light" size="sm" onClick={() => navigate('/client/mes-interventions')}>
            Mes demandes
          </Button>
          <Button variant="outline-light" size="sm" onClick={() => { logout(); navigate('/login'); }}>
            Déconnexion
          </Button>
          <Button variant="outline-light" size="sm" onClick={() => navigate('/client/dashboard')}>
            Retour au tableau de bord
          </Button>
        </div>
      </Navbar>

      <Container className="py-5">
        <Row className="justify-content-center">
          <Col xs={12} md={8} lg={6}>
            <Card className="shadow-sm">
              <Card.Body className="p-4 p-md-5">
                <h4 className="fw-bold mb-1">Nouvelle demande d'intervention</h4>
                <p className="text-muted mb-4">Décrivez le problème rencontré.</p>

                {error && <Alert variant="danger">{error}</Alert>}
                {success && <Alert variant="success">Demande envoyée avec succès !</Alert>}

                <Form onSubmit={handleSubmit}>
                  <Form.Group className="mb-3">
                    <Form.Label>Type de panne / besoin</Form.Label>
                    <Form.Control
                      name="type_panne"
                      value={form.type_panne}
                      onChange={handleChange}
                      placeholder="Ex: Climatiseur en panne"
                      required
                    />
                  </Form.Group>

                  <Form.Group className="mb-3">
                    <div className="d-flex justify-content-between align-items-center mb-1">
                      <Form.Label className="mb-0">Description</Form.Label>
                      <Button
                        variant="outline-secondary"
                        size="sm"
                        onClick={handleGenerateDescription}
                        disabled={generating}
                      >
                        {generating ? (
                          <>
                            <Spinner size="sm" animation="border" className="me-1" />
                            Génération...
                          </>
                        ) : (
                          '✨ Générer une description'
                        )}
                      </Button>
                    </div>
                    {genError && <div className="text-danger small mb-2">{genError}</div>}
                    <Form.Control
                      as="textarea"
                      rows={4}
                      name="description"
                      value={form.description}
                      onChange={handleChange}
                      required
                    />
                  </Form.Group>

                  <Row>
                    <Col md={6}>
                      <Form.Group className="mb-3">
                        <Form.Label>Priorité</Form.Label>
                        <Form.Select name="priorite" value={form.priorite} onChange={handleSelectChange}>
                          <option value="BASSE">Basse</option>
                          <option value="NORMALE">Normale</option>
                          <option value="HAUTE">Haute</option>
                          <option value="URGENTE">Urgente</option>
                        </Form.Select>
                      </Form.Group>
                    </Col>
                    <Col md={6}>
                      <Form.Group className="mb-4">
                        <Form.Label>Date souhaitée (optionnel)</Form.Label>
                        <Form.Control
                          type="date"
                          name="date_souhaitee"
                          value={form.date_souhaitee}
                          onChange={handleChange}
                        />
                      </Form.Group>
                    </Col>
                  </Row>

                  <Button type="submit" variant="primary" className="w-100" disabled={loading}>
                    {loading ? <Spinner size="sm" animation="border" /> : 'Envoyer la demande'}
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