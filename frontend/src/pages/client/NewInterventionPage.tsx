import { useState } from 'react';
import { Row, Col, Form, Button, Alert, Spinner } from 'react-bootstrap';
import { Stars } from 'react-bootstrap-icons';
import { useNavigate } from 'react-router-dom';
import { createIntervention, generateDescription } from '../../api/interventions';
import { PageHeader, Panel } from '../../components/ui';

export default function NewInterventionPage() {
  const navigate = useNavigate();
  const [form, setForm] = useState({
    type_panne: '', description: '', priorite: 'NORMALE', date_souhaitee: '',
  });
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [genError, setGenError] = useState<string | null>(null);
  const [genNotice, setGenNotice] = useState<string | null>(null);

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
    setGenNotice(null);
    setGenerating(true);
    try {
      const result = await generateDescription(form.type_panne);
      setForm((prev) => ({ ...prev, description: result.description }));
      if (result.source === 'modele') {
        setGenNotice(
          `L'assistant IA est indisponible${result.detail ? ` (${result.detail})` : ''} : ` +
          'un modèle de description vous est proposé, complétez les parties entre crochets.'
        );
      }
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
    <>
      <PageHeader
        eyebrow="Espace client"
        title="Nouvelle demande d'intervention"
        subtitle="Décrivez le problème rencontré : un responsable affectera un technicien rapidement."
      />
      <Row className="g-4">
        <Col lg={8}>
          <Panel>
            {error && <Alert variant="danger">{error}</Alert>}
            {success && <Alert variant="success">Demande envoyée avec succès ! Redirection…</Alert>}

            <Form onSubmit={handleSubmit}>
              <Form.Group className="mb-3">
                <Form.Label>Type de panne / besoin</Form.Label>
                <Form.Control
                  name="type_panne"
                  value={form.type_panne}
                  onChange={handleChange}
                  placeholder="Ex : Climatiseur en panne"
                  required
                />
              </Form.Group>

              <Form.Group className="mb-3">
                <div className="d-flex justify-content-between align-items-center mb-1">
                  <Form.Label className="mb-0">Description</Form.Label>
                  <Button
                    variant="outline-primary"
                    size="sm"
                    onClick={handleGenerateDescription}
                    disabled={generating}
                  >
                    {generating ? (
                      <>
                        <Spinner size="sm" animation="border" className="me-1" />
                        Génération…
                      </>
                    ) : (
                      <><Stars className="me-1" /> Générer avec l'IA</>
                    )}
                  </Button>
                </div>
                {genError && <div className="text-danger small mb-2">{genError}</div>}
                {genNotice && <Alert variant="warning" className="py-2 small mb-2">{genNotice}</Alert>}
                <Form.Control
                  as="textarea"
                  rows={5}
                  name="description"
                  value={form.description}
                  onChange={handleChange}
                  placeholder="Symptômes, depuis quand, localisation de l'équipement…"
                  required
                />
                <Form.Text>Vous pouvez modifier librement la suggestion de l'IA avant l'envoi.</Form.Text>
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

              <div className="d-flex gap-2 justify-content-end">
                <Button variant="outline-secondary" onClick={() => navigate('/client/dashboard')}>Annuler</Button>
                <Button type="submit" variant="primary" disabled={loading}>
                  {loading ? <Spinner size="sm" animation="border" /> : 'Envoyer la demande'}
                </Button>
              </div>
            </Form>
          </Panel>
        </Col>
        <Col lg={4}>
          <Panel title="Comment ça marche ?">
            <ol className="howto">
              <li><strong>Vous décrivez</strong> le problème (l'IA peut vous aider à rédiger).</li>
              <li><strong>Un responsable</strong> affecte un technicien qualifié.</li>
              <li><strong>Le technicien intervient</strong> et documente avec photos avant / après.</li>
              <li><strong>Vous recevez</strong> le rapport PDF et pouvez laisser un avis.</li>
            </ol>
          </Panel>
        </Col>
      </Row>
    </>
  );
}
