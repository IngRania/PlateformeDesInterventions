import { useEffect, useState } from 'react';
import { Container, Table, Navbar, Button, Spinner, Row, Col, Modal, Form } from 'react-bootstrap';
import { useNavigate } from 'react-router-dom';
import { listInterventions, Intervention, downloadPDF, submitAvis } from '../../api/interventions';
import { useAuth } from '../../context/AuthContext';

const statutMeta: Record<string, { label: string; color: string }> = {
  EN_ATTENTE: { label: 'En attente', color: 'var(--st-attente)' },
  AFFECTEE: { label: 'Affectée', color: 'var(--st-affectee)' },
  EN_COURS: { label: 'En cours', color: 'var(--st-encours)' },
  TERMINEE: { label: 'Terminée', color: 'var(--st-terminee)' },
};

function StatutPill({ statut }: { statut: string }) {
  const meta = statutMeta[statut];
  return (
    <span className="statut-pill" style={{ color: meta.color, background: `${meta.color}22` }}>
      {meta.label}
    </span>
  );
}

export default function ClientDashboardPage() {
  const navigate = useNavigate();
  const { user, logout } = useAuth();

  const [items, setItems] = useState<Intervention[]>([]);
  const [loading, setLoading] = useState(true);

  const [ratingIntervention, setRatingIntervention] = useState<Intervention | null>(null);
  const [note, setNote] = useState(5);
  const [commentaire, setCommentaire] = useState('');
  const [submittingAvis, setSubmittingAvis] = useState(false);

  const load = () => {
    setLoading(true);
    listInterventions().then((res) => setItems(res.data)).finally(() => setLoading(false));
  };

  useEffect(() => {
    load();
    const interval = setInterval(load, 5000); // rafraîchit toutes les 5s
   return () => clearInterval(interval);
  }, []);

  const counts = {
    EN_ATTENTE: items.filter((i) => i.statut === 'EN_ATTENTE').length,
    AFFECTEE: items.filter((i) => i.statut === 'AFFECTEE').length,
    EN_COURS: items.filter((i) => i.statut === 'EN_COURS').length,
    TERMINEE: items.filter((i) => i.statut === 'TERMINEE').length,
  };

  const handleSubmitAvis = async () => {
    if (!ratingIntervention) return;
    setSubmittingAvis(true);
    try {
      await submitAvis(ratingIntervention.id, note, commentaire);
      setRatingIntervention(null);
      setNote(5);
      setCommentaire('');
      load();
    } catch {
      // erreur silencieuse — possibilité d'ajouter un state error dédié si besoin
    } finally {
      setSubmittingAvis(false);
    }
  };

  return (
    <div>
      <Navbar className="app-navbar px-4 py-3">
        <div>
          <div className="mono" style={{ color: 'var(--accent)', fontSize: '0.72rem', letterSpacing: '0.06em' }}>
            ESPACE CLIENT
          </div>
          <div style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: '1.1rem', color: 'var(--text)' }}>
            {user?.first_name} {user?.last_name}
          </div>
        </div>
        <div className="ms-auto d-flex gap-2">
          <Button className="btn-accent" size="sm" onClick={() => navigate('/client/nouvelle-demande')}>
            + Nouvelle demande
          </Button>
          <Button variant="outline-light" size="sm" onClick={() => navigate('/client/profile')}>
            Mon profil
          </Button>
          <Button variant="outline-light" size="sm" onClick={() => { logout(); navigate('/login'); }}>
            Déconnexion
          </Button>
        </div>
      </Navbar>

      <Container className="py-5">
        <div className="page-header">
          <div className="page-eyebrow">TABLEAU DE BORD</div>
          <h4 className="fw-bold mb-0">Mes demandes d'intervention</h4>
        </div>

        <Row className="g-3 mb-4">
          {(['EN_ATTENTE', 'AFFECTEE', 'EN_COURS', 'TERMINEE'] as const).map((statut) => (
            <Col xs={6} md={3} key={statut}>
              <div className="kpi-card" style={{ ['--kpi-color' as any]: statutMeta[statut].color }}>
                <div className="kpi-label">{statutMeta[statut].label.toUpperCase()}</div>
                <div className="kpi-value">{counts[statut]}</div>
              </div>
            </Col>
          ))}
        </Row>

        <div className="app-card p-4">
          {loading ? (
            <Spinner animation="border" style={{ color: 'var(--accent)' }} />
          ) : items.length === 0 ? (
            <div className="text-center py-5">
              <p className="text-muted mb-3">Vous n'avez encore fait aucune demande.</p>
              <Button className="btn-accent" onClick={() => navigate('/client/nouvelle-demande')}>
                Créer ma première demande
              </Button>
            </div>
          ) : (
            <Table responsive hover className="mb-0">
              <thead>
                <tr>
                  <th>Type</th>
                  <th>Description</th>
                  <th>Priorité</th>
                  <th>Statut</th>
                  <th>Technicien</th>
                  <th>Créée le</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {items.map((i) => (
                  <tr key={i.id}>
                    <td className="fw-semibold">{i.type_panne}</td>
                    <td className="small text-muted" style={{ maxWidth: 280 }}>{i.description}</td>
                    <td className="small">{i.priorite}</td>
                    <td><StatutPill statut={i.statut} /></td>
                    <td className="mono small">{i.technicien_nom || '—'}</td>
                    <td className="small text-muted">{new Date(i.created_at).toLocaleDateString()}</td>
                    <td className="text-end">
                      {i.statut === 'TERMINEE' && (
                        <div className="d-flex flex-column gap-1 align-items-end">
                          <Button size="sm" variant="outline-light" onClick={() => downloadPDF(i.id)}>
                            📄 Rapport PDF
                          </Button>
                          {i.avis ? (
                            <span className="mono small" style={{ color: 'var(--accent)' }}>
                              ⭐ {i.avis.note}/5
                            </span>
                          ) : (
                            <Button size="sm" className="btn-accent" onClick={() => setRatingIntervention(i)}>
                              Laisser un avis
                            </Button>
                          )}
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </Table>
          )}
        </div>
      </Container>

      <Modal show={!!ratingIntervention} onHide={() => setRatingIntervention(null)}>
        <Modal.Header closeButton>
          <Modal.Title>Évaluer l'intervention</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <p className="text-muted small">{ratingIntervention?.type_panne}</p>

          <Form.Group className="mb-3">
            <Form.Label>Note</Form.Label>
            <div style={{ fontSize: '1.8rem', cursor: 'pointer' }}>
              {[1, 2, 3, 4, 5].map((n) => (
                <span
                  key={n}
                  onClick={() => setNote(n)}
                  style={{ color: n <= note ? 'var(--accent)' : 'var(--border)', marginRight: 4 }}
                >
                  ★
                </span>
              ))}
            </div>
          </Form.Group>

          <Form.Group>
            <Form.Label>Commentaire (optionnel)</Form.Label>
            <Form.Control
              as="textarea"
              rows={3}
              className="form-control-dark"
              value={commentaire}
              onChange={(e) => setCommentaire(e.target.value)}
              placeholder="Votre retour sur la prestation..."
            />
          </Form.Group>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setRatingIntervention(null)}>Annuler</Button>
          <Button className="btn-accent" disabled={submittingAvis} onClick={handleSubmitAvis}>
            {submittingAvis ? <Spinner size="sm" animation="border" /> : 'Envoyer'}
          </Button>
        </Modal.Footer>
      </Modal>
    </div>
  );
}