import { useEffect, useState } from 'react';
import { Alert, Button, Form, Modal, Spinner } from 'react-bootstrap';
import { StarFill } from 'react-bootstrap-icons';
import api from '../api/axios';
import { assignTechnicien, Intervention, submitAvis, updateStatut } from '../api/interventions';
import { apiError } from '../utils/format';

interface Technicien { id: number; first_name: string; last_name: string; matricule: string; }

interface BaseProps {
  intervention: Intervention | null;
  onHide: () => void;
  onDone: (updated: Intervention) => void;
}

/** Responsable : affecter un technicien à une demande en attente. */
export function AssignModal({ intervention, onHide, onDone }: BaseProps) {
  const [technicians, setTechnicians] = useState<Technicien[]>([]);
  const [chosen, setChosen] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!intervention) return;
    setChosen('');
    setError(null);
    api.get<Technicien[]>('/auth/technicians/')
      .then((res) => setTechnicians(res.data))
      .catch(() => setError('Impossible de charger la liste des techniciens.'));
  }, [intervention]);

  const submit = async () => {
    if (!intervention || !chosen) return;
    setSaving(true);
    setError(null);
    try {
      const res = await assignTechnicien(intervention.id, parseInt(chosen, 10));
      onDone(res.data);
    } catch (err) {
      setError(apiError(err, "Erreur lors de l'affectation."));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal show={!!intervention} onHide={onHide} centered>
      <Modal.Header closeButton>
        <Modal.Title>Affecter un technicien</Modal.Title>
      </Modal.Header>
      <Modal.Body>
        {error && <Alert variant="danger">{error}</Alert>}
        <div className="modal-summary">
          <div className="fw-semibold">{intervention?.type_panne}</div>
          <div className="text-muted small">{intervention?.client_nom} — {intervention?.description}</div>
        </div>
        <Form.Label>Technicien</Form.Label>
        <Form.Select value={chosen} onChange={(e) => setChosen(e.target.value)}>
          <option value="">— Choisir un technicien —</option>
          {technicians.map((t) => (
            <option key={t.id} value={t.id}>
              {t.matricule} — {t.first_name} {t.last_name}
            </option>
          ))}
        </Form.Select>
        <Form.Text>Le technicien est prévenu par email dès l'affectation.</Form.Text>
      </Modal.Body>
      <Modal.Footer>
        <Button variant="outline-secondary" onClick={onHide}>Annuler</Button>
        <Button variant="primary" disabled={!chosen || saving} onClick={submit}>
          {saving ? <Spinner size="sm" animation="border" /> : "Confirmer l'affectation"}
        </Button>
      </Modal.Footer>
    </Modal>
  );
}

/** Technicien : clôturer une intervention avec un compte-rendu. */
export function CloseModal({ intervention, onHide, onDone }: BaseProps) {
  const [compteRendu, setCompteRendu] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setCompteRendu('');
    setError(null);
  }, [intervention]);

  const submit = async () => {
    if (!intervention || !compteRendu.trim()) return;
    setSaving(true);
    setError(null);
    try {
      const res = await updateStatut(intervention.id, 'TERMINEE', compteRendu);
      onDone(res.data);
    } catch (err) {
      setError(apiError(err, 'Erreur lors de la clôture.'));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal show={!!intervention} onHide={onHide} centered>
      <Modal.Header closeButton>
        <Modal.Title>Clôturer l'intervention</Modal.Title>
      </Modal.Header>
      <Modal.Body>
        {error && <Alert variant="danger">{error}</Alert>}
        <div className="modal-summary">
          <div className="fw-semibold">{intervention?.type_panne}</div>
          <div className="text-muted small">{intervention?.client_nom}</div>
        </div>
        <Form.Group>
          <Form.Label>Compte-rendu de l'intervention</Form.Label>
          <Form.Control
            as="textarea"
            rows={5}
            value={compteRendu}
            onChange={(e) => setCompteRendu(e.target.value)}
            placeholder="Diagnostic, actions effectuées, pièces remplacées…"
          />
        </Form.Group>
      </Modal.Body>
      <Modal.Footer>
        <Button variant="outline-secondary" onClick={onHide}>Annuler</Button>
        <Button variant="success" disabled={!compteRendu.trim() || saving} onClick={submit}>
          {saving ? <Spinner size="sm" animation="border" /> : 'Clôturer'}
        </Button>
      </Modal.Footer>
    </Modal>
  );
}

/** Client : noter une intervention terminée (1 à 5). */
export function AvisModal({ intervention, onHide, onDone }: BaseProps) {
  const [note, setNote] = useState(5);
  const [hover, setHover] = useState(0);
  const [commentaire, setCommentaire] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setNote(5);
    setCommentaire('');
    setError(null);
  }, [intervention]);

  const submit = async () => {
    if (!intervention) return;
    setSaving(true);
    setError(null);
    try {
      const res = await submitAvis(intervention.id, note, commentaire);
      onDone(res.data);
    } catch (err) {
      setError(apiError(err, "Erreur lors de l'envoi de l'avis."));
    } finally {
      setSaving(false);
    }
  };

  const labels = ['', 'Très insatisfait', 'Insatisfait', 'Correct', 'Satisfait', 'Excellent'];

  return (
    <Modal show={!!intervention} onHide={onHide} centered>
      <Modal.Header closeButton>
        <Modal.Title>Évaluer l'intervention</Modal.Title>
      </Modal.Header>
      <Modal.Body>
        {error && <Alert variant="danger">{error}</Alert>}
        <div className="modal-summary">
          <div className="fw-semibold">{intervention?.type_panne}</div>
          <div className="text-muted small">Réalisée par {intervention?.technicien_nom || '—'}</div>
        </div>
        <Form.Label>Votre note</Form.Label>
        <div className="star-input" onMouseLeave={() => setHover(0)}>
          {[1, 2, 3, 4, 5].map((n) => (
            <button
              key={n}
              type="button"
              className={`star ${n <= (hover || note) ? 'on' : ''}`}
              onMouseEnter={() => setHover(n)}
              onClick={() => setNote(n)}
              aria-label={`${n} sur 5`}
            >
              <StarFill />
            </button>
          ))}
          <span className="star-label">{labels[hover || note]}</span>
        </div>
        <Form.Group className="mt-3">
          <Form.Label>Commentaire (optionnel)</Form.Label>
          <Form.Control
            as="textarea"
            rows={3}
            value={commentaire}
            onChange={(e) => setCommentaire(e.target.value)}
            placeholder="Votre retour sur la prestation…"
          />
        </Form.Group>
      </Modal.Body>
      <Modal.Footer>
        <Button variant="outline-secondary" onClick={onHide}>Annuler</Button>
        <Button variant="primary" disabled={saving} onClick={submit}>
          {saving ? <Spinner size="sm" animation="border" /> : "Envoyer l'avis"}
        </Button>
      </Modal.Footer>
    </Modal>
  );
}
