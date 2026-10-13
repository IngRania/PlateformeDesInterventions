import { useEffect, useState } from 'react';
import { Container, Table, Navbar, Button, Modal, Form, Spinner, Alert, Row, Col } from 'react-bootstrap';
import { useNavigate } from 'react-router-dom';
import {
  listEquipments, createEquipment, updateEquipment, deleteEquipment,
  listClients, Equipment, ClientMini,
} from '../../api/equipments';
import { useAuth } from '../../context/AuthContext';

const emptyForm = {
  client: '', type_equipement: '', reference: '', date_installation: '', notes: '',
};

export default function EquipmentsPage() {
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const [items, setItems] = useState<Equipment[]>([]);
  const [clients, setClients] = useState<ClientMini[]>([]);
  const [loading, setLoading] = useState(true);

  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState<Equipment | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const load = () => {
    setLoading(true);
    listEquipments().then((res) => setItems(res.data)).finally(() => setLoading(false));
  };

  useEffect(() => {
    load();
    const interval = setInterval(load, 5000); // rafraîchit toutes les 5s
   return () => clearInterval(interval);
  }, []);

  const openCreate = () => {
    setEditing(null);
    setForm(emptyForm);
    setError(null);
    setShowModal(true);
  };

  const openEdit = (eq: Equipment) => {
    setEditing(eq);
    setForm({
      client: String(eq.client),
      type_equipement: eq.type_equipement,
      reference: eq.reference,
      date_installation: eq.date_installation || '',
      notes: eq.notes || '',
    });
    setError(null);
    setShowModal(true);
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };
  const handleClientChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setForm({ ...form, client: e.target.value });
  };

  const handleSave = async () => {
    setError(null);
    setSaving(true);
    try {
      const payload = {
        client: parseInt(form.client, 10),
        type_equipement: form.type_equipement,
        reference: form.reference,
        date_installation: form.date_installation || null,
        notes: form.notes,
      };
      if (editing) {
        await updateEquipment(editing.id, payload);
      } else {
        await createEquipment(payload);
      }
      setShowModal(false);
      load();
    } catch (err: any) {
      const data = err.response?.data;
      const firstError = data ? Object.values(data)[0] : null;
      setError(Array.isArray(firstError) ? firstError[0] : "Erreur lors de l'enregistrement.");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (eq: Equipment) => {
    if (!window.confirm(`Supprimer l'équipement "${eq.type_equipement}" (${eq.reference}) ?`)) return;
    await deleteEquipment(eq.id);
    load();
  };

  return (
    <div>
      <Navbar className="app-navbar px-4 py-3">
        <div>
          <div className="mono" style={{ color: 'var(--accent)', fontSize: '0.72rem', letterSpacing: '0.06em' }}>
            {user?.role === 'ADMIN' ? 'ESPACE ADMIN' : 'ESPACE RESPONSABLE'}
          </div>
          <div style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: '1.1rem' }}>
            Équipements
          </div>
        </div>
        <div className="ms-auto d-flex gap-2">
          <Button variant="outline-light" size="sm" onClick={() => navigate('/responsable/interventions')}>
            Demandes
          </Button>
          <Button variant="outline-light" size="sm" onClick={() => navigate('/responsable/calendrier')}>
            Calendrier
          </Button>
          <Button variant="outline-light" size="sm" onClick={() => { logout(); navigate('/login'); }}>
            Déconnexion
          </Button>
        </div>
      </Navbar>

      <Container className="py-5">
        <div className="page-header d-flex justify-content-between align-items-end">
          <div>
            <div className="page-eyebrow">PARC MATÉRIEL</div>
            <h4 className="fw-bold mb-0">Gestion des équipements</h4>
          </div>
          <Button className="btn-accent" onClick={openCreate}>+ Ajouter un équipement</Button>
        </div>

        <div className="app-card p-4">
          {loading ? (
            <Spinner animation="border" style={{ color: 'var(--accent)' }} />
          ) : items.length === 0 ? (
            <p className="text-muted mb-0">Aucun équipement enregistré pour l'instant.</p>
          ) : (
            <Table responsive hover className="mb-0">
              <thead>
                <tr>
                  <th>Type</th>
                  <th>Référence</th>
                  <th>Client</th>
                  <th>Installé le</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {items.map((eq) => (
                  <tr key={eq.id}>
                    <td className="fw-semibold">{eq.type_equipement}</td>
                    <td className="mono small">{eq.reference}</td>
                    <td className="small">{eq.client_nom || eq.client_email}</td>
                    <td className="small text-muted">
                      {eq.date_installation ? new Date(eq.date_installation).toLocaleDateString() : '—'}
                    </td>
                    <td className="text-end">
                      <Button size="sm" variant="outline-light" className="me-2" onClick={() => openEdit(eq)}>
                        Modifier
                      </Button>
                      <Button size="sm" variant="outline-danger" onClick={() => handleDelete(eq)}>
                        Supprimer
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </Table>
          )}
        </div>
      </Container>

      <Modal show={showModal} onHide={() => setShowModal(false)}>
        <Modal.Header closeButton>
          <Modal.Title>{editing ? 'Modifier l\'équipement' : 'Nouvel équipement'}</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          {error && <Alert variant="danger">{error}</Alert>}
          <Form>
            <Form.Group className="mb-3">
              <Form.Label>Client propriétaire</Form.Label>
              <Form.Select
                className="form-control-dark"
                value={form.client}
                onChange={handleClientChange}
              >
                <option value="">-- Choisir un client --</option>
                {clients.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.first_name} {c.last_name} — {c.email}
                  </option>
                ))}
              </Form.Select>
            </Form.Group>

            <Row>
              <Col md={6}>
                <Form.Group className="mb-3">
                  <Form.Label>Type d'équipement</Form.Label>
                  <Form.Control
                    className="form-control-dark"
                    name="type_equipement"
                    value={form.type_equipement}
                    onChange={handleChange}
                    placeholder="Ex: Climatiseur"
                  />
                </Form.Group>
              </Col>
              <Col md={6}>
                <Form.Group className="mb-3">
                  <Form.Label>Référence</Form.Label>
                  <Form.Control
                    className="form-control-dark"
                    name="reference"
                    value={form.reference}
                    onChange={handleChange}
                    placeholder="Ex: CLM-2024-001"
                  />
                </Form.Group>
              </Col>
            </Row>

            <Form.Group className="mb-3">
              <Form.Label>Date d'installation</Form.Label>
              <Form.Control
                type="date"
                className="form-control-dark"
                name="date_installation"
                value={form.date_installation}
                onChange={handleChange}
              />
            </Form.Group>

            <Form.Group className="mb-2">
              <Form.Label>Notes</Form.Label>
              <Form.Control
                as="textarea"
                rows={2}
                className="form-control-dark"
                name="notes"
                value={form.notes}
                onChange={handleChange}
              />
            </Form.Group>
          </Form>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setShowModal(false)}>Annuler</Button>
          <Button
            className="btn-accent"
            disabled={saving || !form.client || !form.type_equipement || !form.reference}
            onClick={handleSave}
          >
            {saving ? <Spinner size="sm" animation="border" /> : 'Enregistrer'}
          </Button>
        </Modal.Footer>
      </Modal>
      <Button variant="outline-light" size="sm" onClick={() => navigate('/responsable/tracking')}>
         Localisation
      </Button>
    </div>
  );
}