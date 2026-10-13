import { useState } from 'react';
import { Row, Col, Form, Button, Alert, Spinner } from 'react-bootstrap';
import api from '../api/axios';
import { PageHeader, Panel } from '../components/ui';

export default function CreateStaffPage() {

  const [form, setForm] = useState({
    first_name: '',
    last_name: '',
    phone: '',
    email: '',
    role: 'TECHNICIEN',
  });
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleRoleChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setForm({ ...form, role: e.target.value });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);
    setLoading(true);
    try {
      const res = await api.post('/auth/staff/', form);
      setSuccess(
        `Compte créé pour ${res.data.first_name} ${res.data.last_name}. ` +
        `Matricule : ${res.data.matricule} — un email avec le matricule et le mot de passe ` +
        `temporaire vient de lui être envoyé à ${res.data.email}.`
      );
      setForm({ first_name: '', last_name: '', phone: '', email: '', role: 'TECHNICIEN' });
    } catch (err: any) {
      const data = err.response?.data;
      const firstError = data ? Object.values(data)[0] : null;
      setError(Array.isArray(firstError) ? firstError[0] : "Erreur lors de la création du compte.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <PageHeader
        eyebrow="Administration"
        title="Créer un compte personnel"
        subtitle="Un matricule (T…/R…) et un mot de passe temporaire sont générés et envoyés automatiquement par email."
      />
      <Row>
        <Col xs={12} lg={8} xl={7}>
          <Panel>
                {error && <Alert variant="danger">{error}</Alert>}
                {success && <Alert variant="success">{success}</Alert>}

                <Form onSubmit={handleSubmit}>
                  <Form.Group className="mb-3">
                    <Form.Label>Rôle</Form.Label>
                    <Form.Select name="role" value={form.role} onChange={handleRoleChange}>
                      <option value="TECHNICIEN">Technicien (matricule T...)</option>
                      <option value="RESPONSABLE">Responsable (matricule R...)</option>
                    </Form.Select>
                  </Form.Group>

                  <Row>
                    <Col md={6}>
                      <Form.Group className="mb-3">
                        <Form.Label>Prénom</Form.Label>
                        <Form.Control
                          name="first_name"
                          value={form.first_name}
                          onChange={handleChange}
                          required
                        />
                      </Form.Group>
                    </Col>
                    <Col md={6}>
                      <Form.Group className="mb-3">
                        <Form.Label>Nom</Form.Label>
                        <Form.Control
                          name="last_name"
                          value={form.last_name}
                          onChange={handleChange}
                          required
                        />
                      </Form.Group>
                    </Col>
                  </Row>

                  <Form.Group className="mb-3">
                    <Form.Label>Email (pour l'envoi des identifiants)</Form.Label>
                    <Form.Control
                      type="email"
                      name="email"
                      value={form.email}
                      onChange={handleChange}
                      required
                    />
                  </Form.Group>

                  <Form.Group className="mb-4">
                    <Form.Label>Téléphone</Form.Label>
                    <Form.Control
                      name="phone"
                      value={form.phone}
                      onChange={handleChange}
                    />
                  </Form.Group>

                  <Button type="submit" variant="primary" className="w-100" disabled={loading}>
                    {loading ? <Spinner size="sm" animation="border" /> : 'Créer le compte et envoyer les identifiants'}
                  </Button>
                </Form>
          </Panel>
        </Col>
      </Row>
    </>
  );
}
