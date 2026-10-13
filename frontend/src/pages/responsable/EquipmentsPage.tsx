import { useEffect, useState } from 'react';
import { Table, Button, Modal, Form, Spinner, Alert, Row, Col } from 'react-bootstrap';
import { Search } from 'react-bootstrap-icons';
import {
  listEquipments, createEquipment, updateEquipment, deleteEquipment,
  listClients, Equipment, ClientMini,
} from '../../api/equipments';
import { EmptyState, Loading, PageHeader } from '../../components/ui';
import { formatDate, matchesSearch } from '../../utils/format';

const emptyForm = {
  client: '', type_equipement: '', reference: '', date_installation: '', notes: '',
};

export default function EquipmentsPage() {
  const [q, setQ] = useState('');
  const [items, setItems] = useState<Equipment[]>([]);
  const [clients, setClients] = useState<ClientMini[]>([]);
  const [loading, setLoading] = useState(true);

  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState<Equipment | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  // Pas de spinner pendant le rafraîchissement périodique (évite le clignotement)
  const load = () => {
    listEquipments().then((res) => setItems(res.data)).finally(() => setLoading(false));
  };

  useEffect(() => {
    load();
    listClients().then((res) => setClients(res.data)).catch(() => setClients([]));
    const interval = setInterval(load, 15000);
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
    <>
      <PageHeader
        eyebrow="Parc matériel"
        title="Gestion des équipements"
        subtitle="Attribuez les équipements aux clients et suivez leur date d'installation."
        actions={<Button variant="primary" onClick={openCreate}>+ Ajouter un équipement</Button>}
      />

        <div className="panel">
          <div className="toolbar">
            <div className="search-input">
              <Search />
              <Form.Control type="search" value={q} onChange={(e) => setQ(e.target.value)}
                placeholder="Type, référence, client…" />
            </div>
            <span className="toolbar-count">{items.length} équipement{items.length > 1 ? 's' : ''}</span>
          </div>
          {loading ? (
            <Loading />
          ) : items.length === 0 ? (
            <EmptyState title="Aucun équipement" text="Aucun équipement enregistré pour l'instant." />
          ) : (
            <Table responsive hover className="data-table mb-0">
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
                {items.filter((eq) => matchesSearch(q, eq.type_equipement, eq.reference, eq.client_nom, eq.client_email, eq.notes)).map((eq) => (
                  <tr key={eq.id}>
                    <td className="fw-semibold">{eq.type_equipement}</td>
                    <td className="mono small">{eq.reference}</td>
                    <td className="small">{eq.client_nom || eq.client_email}</td>
                    <td className="small text-muted">
                      {formatDate(eq.date_installation)}
                    </td>
                    <td className="text-end">
                      <Button size="sm" variant="outline-primary" className="me-2" onClick={() => openEdit(eq)}>
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
            variant="primary"
            disabled={saving || !form.client || !form.type_equipement || !form.reference}
            onClick={handleSave}
          >
            {saving ? <Spinner size="sm" animation="border" /> : 'Enregistrer'}
          </Button>
        </Modal.Footer>
      </Modal>
    </>
  );
}