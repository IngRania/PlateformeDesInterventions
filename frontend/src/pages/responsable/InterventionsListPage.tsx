import { useState, useEffect } from 'react';
import { Container, Table, Badge, Navbar, Button, Modal, Form, Spinner, Alert } from 'react-bootstrap';
import { useNavigate } from 'react-router-dom';
import { listInterventions, assignTechnicien, downloadPDF, Intervention } from '../../api/interventions';
import api from '../../api/axios';
import { useAuth } from '../../context/AuthContext';

interface Technicien { id: number; first_name: string; last_name: string; matricule: string; }

const statutColors: Record<string, string> = {
  EN_ATTENTE: 'secondary', AFFECTEE: 'info', EN_COURS: 'warning', TERMINEE: 'success',
};

export default function InterventionsListPage() {
  const navigate = useNavigate();
  const { logout } = useAuth();
  const [items, setItems] = useState<Intervention[]>([]);
  const [technicians, setTechnicians] = useState<Technicien[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<Intervention | null>(null);
  const [chosenTech, setChosenTech] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [assigning, setAssigning] = useState(false);

  const load = () => {
    listInterventions()
      .then((res) => setItems(res.data))
      .catch(() => {
        // échec silencieux pendant le polling — on garde les données précédentes
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    load();
    const interval = setInterval(load, 5000);

    api.get('/auth/technicians/')
      .then((res) => setTechnicians(res.data))
      .catch((err) => {
        console.error('Erreur chargement techniciens:', err.response?.status, err.response?.data);
      });

    return () => clearInterval(interval);
  }, []);

  const handleAssign = async () => {
    if (!selected || !chosenTech) return;
    setError(null);
    setAssigning(true);
    try {
      await assignTechnicien(selected.id, parseInt(chosenTech, 10));
      setSelected(null);
      setChosenTech('');
      load();
    } catch (err: any) {
      const data = err.response?.data;
      const firstError = data ? Object.values(data)[0] : null;
      setError(Array.isArray(firstError) ? firstError[0] : "Erreur lors de l'affectation.");
    } finally {
      setAssigning(false);
    }
  };

  return (
    <div>
      <Navbar className="px-4 py-3" bg="dark" variant="dark">
        <Navbar.Brand className="fw-bold">Espace Responsable</Navbar.Brand>
        <div className="ms-auto d-flex gap-2">
          <Button variant="outline-light" size="sm" onClick={() => navigate('/responsable/calendrier')}>
            Calendrier
          </Button>
          <Button variant="outline-light" size="sm" onClick={() => navigate('/responsable/equipements')}>
            Équipements
          </Button>
          <Button variant="outline-light" size="sm" onClick={() => { logout(); navigate('/staff-login'); }}>
            Déconnexion
          </Button>
        </div>
      </Navbar>

      <Container className="py-5">
        <h4 className="fw-bold mb-4">Demandes d'intervention</h4>
        {loading ? (
          <Spinner animation="border" />
        ) : (
          <Table responsive hover>
            <thead>
              <tr>
                <th>Client</th><th>Type</th><th>Priorité</th><th>Statut</th><th>Technicien</th><th></th>
              </tr>
            </thead>
            <tbody>
              {items.map((i) => (
                <tr key={i.id}>
                  <td>{i.client_nom || i.client_email}</td>
                  <td>{i.type_panne}</td>
                  <td>{i.priorite}</td>
                  <td><Badge bg={statutColors[i.statut]}>{i.statut.replace('_', ' ')}</Badge></td>
                  <td>{i.technicien_nom || '—'}</td>
                  <td className="text-end">
                    {i.statut === 'EN_ATTENTE' && (
                      <Button size="sm" variant="primary" onClick={() => setSelected(i)}>
                        Affecter
                      </Button>
                    )}
                    {i.statut === 'TERMINEE' && (
                      <Button size="sm" variant="outline-light" onClick={() => downloadPDF(i.id)}>
                        📄 Rapport PDF
                      </Button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </Table>
        )}
      </Container>

      <Modal show={!!selected} onHide={() => setSelected(null)}>
        <Modal.Header closeButton>
          <Modal.Title>Affecter un technicien</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          {error && <Alert variant="danger">{error}</Alert>}
          <p className="text-muted">{selected?.type_panne} — {selected?.description}</p>
          <Form.Select value={chosenTech} onChange={(e) => setChosenTech(e.target.value)}>
            <option value="">-- Choisir un technicien --</option>
            {technicians.map((t) => (
              <option key={t.id} value={t.id}>
                {t.matricule} — {t.first_name} {t.last_name}
              </option>
            ))}
          </Form.Select>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setSelected(null)}>Annuler</Button>
          <Button variant="primary" disabled={!chosenTech || assigning} onClick={handleAssign}>
            {assigning ? <Spinner size="sm" animation="border" /> : 'Confirmer'}
          </Button>
        </Modal.Footer>
      </Modal>

      <Button variant="outline-light" size="sm" onClick={() => navigate('/responsable/tracking')}>
         Localisation
      </Button>
    </div>
  );
}