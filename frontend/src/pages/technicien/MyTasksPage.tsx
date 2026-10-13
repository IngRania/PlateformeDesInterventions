import { useEffect, useState } from 'react';
import { Container, Table, Badge, Navbar, Button, Spinner, Alert, Modal, Form } from 'react-bootstrap';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { listInterventions, updateStatut, uploadPhoto, Intervention } from '../../api/interventions';
import LocationSender from '../../components/LocationSender';

const statutColors: Record<string, string> = {
  AFFECTEE: 'info', EN_COURS: 'warning', TERMINEE: 'success',
};

const nextStatut: Record<string, string | null> = {
  AFFECTEE: 'EN_COURS',
  EN_COURS: 'TERMINEE',
  TERMINEE: null,
};

const nextLabel: Record<string, string> = {
  AFFECTEE: 'Démarrer l\'intervention',
  EN_COURS: 'Clôturer l\'intervention',
};

export default function MyTasksPage() {
  const navigate = useNavigate();
  const { logout } = useAuth();
  const [items, setItems] = useState<Intervention[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [updating, setUpdating] = useState<number | null>(null);
  const [uploadingId, setUploadingId] = useState<number | null>(null);

  const [closingIntervention, setClosingIntervention] = useState<Intervention | null>(null);
  const [compteRendu, setCompteRendu] = useState('');

  const load = () => {
    setLoading(true);
    listInterventions().then((res) => setItems(res.data)).finally(() => setLoading(false));
  };

  useEffect(() => {
    load();
    const interval = setInterval(load, 5000); // rafraîchit toutes les 5s
   return () => clearInterval(interval);
  }, []);

  const handleAdvance = async (i: Intervention) => {
    const target = nextStatut[i.statut];
    if (!target) return;

    if (target === 'TERMINEE') {
      setClosingIntervention(i);
      setCompteRendu('');
      setError(null);
      return;
    }

    setError(null);
    setUpdating(i.id);
    try {
      await updateStatut(i.id, target);
      load();
    } catch (err: any) {
      const data = err.response?.data;
      const firstError = data ? Object.values(data)[0] : null;
      setError(Array.isArray(firstError) ? firstError[0] : 'Erreur lors du changement de statut.');
    } finally {
      setUpdating(null);
    }
  };

  const handleConfirmClose = async () => {
    if (!closingIntervention || !compteRendu.trim()) return;
    setError(null);
    setUpdating(closingIntervention.id);
    try {
      await updateStatut(closingIntervention.id, 'TERMINEE', compteRendu);
      setClosingIntervention(null);
      setCompteRendu('');
      load();
    } catch (err: any) {
      const data = err.response?.data;
      const firstError = data ? Object.values(data)[0] : null;
      setError(Array.isArray(firstError) ? firstError[0] : 'Erreur lors de la clôture.');
    } finally {
      setUpdating(null);
    }
  };

  const handlePhotoChange = async (
    e: React.ChangeEvent<HTMLInputElement>,
    intervention: Intervention,
    type: 'avant' | 'apres'
  ) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingId(intervention.id);
    try {
      await uploadPhoto(intervention.id, type, file);
      load();
    } catch {
      setError("Erreur lors de l'envoi de la photo.");
    } finally {
      setUploadingId(null);
      e.target.value = '';
    }
  };

  return (
    <div>
      <LocationSender />
      <Navbar className="px-4 py-3" bg="success" variant="dark">
        <Navbar.Brand className="fw-bold">Espace Technicien</Navbar.Brand>
        <Button variant="outline-light" size="sm" className="ms-auto" onClick={() => { logout(); navigate('/staf-login'); }}>
          Déconnexion
        </Button>
      </Navbar>

      <Container className="py-5">
        <h4 className="fw-bold mb-4">Mes interventions affectées</h4>
        {error && <Alert variant="danger">{error}</Alert>}
        {loading ? (
          <Spinner animation="border" />
        ) : items.length === 0 ? (
          <p className="text-muted">Aucune intervention affectée pour l'instant.</p>
        ) : (
          <Table responsive hover>
            <thead>
              <tr>
                <th>Client</th><th>Type</th><th>Description</th><th>Priorité</th><th>Statut</th><th>Photos / Action</th>
              </tr>
            </thead>
            <tbody>
              {items.map((i) => (
                <tr key={i.id}>
                  <td>{i.client_nom}</td>
                  <td>{i.type_panne}</td>
                  <td className="small">{i.description}</td>
                  <td>{i.priorite}</td>
                  <td><Badge bg={statutColors[i.statut] || 'secondary'}>{i.statut.replace('_', ' ')}</Badge></td>
                  <td>
                    <div className="d-flex flex-column gap-1">
                      {i.statut === 'EN_COURS' && !i.photo_avant_url && (
                        <label className="btn btn-sm btn-outline-light mb-0">
                          📷 Photo avant
                          <input
                            type="file"
                            accept="image/*"
                            hidden
                            disabled={uploadingId === i.id}
                            onChange={(e) => handlePhotoChange(e, i, 'avant')}
                          />
                        </label>
                      )}
                      {i.statut === 'EN_COURS' && !i.photo_apres_url && (
                        <label className="btn btn-sm btn-outline-light mb-0">
                          📷 Photo après
                          <input
                            type="file"
                            accept="image/*"
                            hidden
                            disabled={uploadingId === i.id}
                            onChange={(e) => handlePhotoChange(e, i, 'apres')}
                          />
                        </label>
                      )}
                      {nextStatut[i.statut] && (
                        <Button
                          size="sm"
                          className="btn-accent"
                          disabled={
                            updating === i.id ||
                            (i.statut === 'EN_COURS' && (!i.photo_avant_url || !i.photo_apres_url))
                          }
                          onClick={() => handleAdvance(i)}
                        >
                          {updating === i.id ? <Spinner size="sm" animation="border" /> : nextLabel[i.statut]}
                        </Button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </Table>
        )}
      </Container>

      <Modal show={!!closingIntervention} onHide={() => setClosingIntervention(null)}>
        <Modal.Header closeButton>
          <Modal.Title>Clôturer l'intervention</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          {error && <Alert variant="danger">{error}</Alert>}
          <p className="text-muted small">
            {closingIntervention?.type_panne} — {closingIntervention?.client_nom}
          </p>
          <Form.Group>
            <Form.Label>Compte-rendu de l'intervention</Form.Label>
            <Form.Control
              as="textarea"
              rows={5}
              className="form-control-dark"
              value={compteRendu}
              onChange={(e) => setCompteRendu(e.target.value)}
              placeholder="Décrivez le diagnostic, les actions effectuées, les pièces remplacées..."
            />
          </Form.Group>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setClosingIntervention(null)}>Annuler</Button>
          <Button
            className="btn-accent"
            disabled={!compteRendu.trim() || updating === closingIntervention?.id}
            onClick={handleConfirmClose}
          >
            {updating === closingIntervention?.id ? <Spinner size="sm" animation="border" /> : 'Clôturer'}
          </Button>
        </Modal.Footer>
      </Modal>
    </div>
  );
}