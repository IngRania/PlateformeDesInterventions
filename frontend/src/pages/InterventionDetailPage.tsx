import { useCallback, useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Alert, Button, Col, Row, Spinner } from 'react-bootstrap';
import {
  ArrowLeft, CameraFill, CheckCircleFill, Circle, ClockHistory, Envelope, FileEarmarkPdfFill,
  PersonBadge, PersonFill, PlayFill, StarFill, Telephone, Wrench,
} from 'react-bootstrap-icons';
import { useAuth } from '../context/AuthContext';
import {
  downloadPDF, getIntervention, InterventionDetail, updateStatut, uploadPhoto,
} from '../api/interventions';
import { AssignModal, AvisModal, CloseModal } from '../components/InterventionModals';
import { EmptyState, Loading, Panel, PrioriteBadge, StatutBadge } from '../components/ui';
import { apiError, formatDate, formatDateTime, STATUTS, statutMeta } from '../utils/format';

function InfoRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="info-row">
      <dt>{label}</dt>
      <dd>{children || '—'}</dd>
    </div>
  );
}

export default function InterventionDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [item, setItem] = useState<InterventionDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [modal, setModal] = useState<'assign' | 'close' | 'avis' | null>(null);

  const load = useCallback(() => {
    if (!id) return;
    getIntervention(id)
      .then((res) => { setItem(res.data); setNotFound(false); })
      .catch((err) => { if (err.response?.status === 404) setNotFound(true); })
      .finally(() => setLoading(false));
  }, [id]);

  useEffect(() => {
    load();
    const interval = setInterval(load, 15000);
    return () => clearInterval(interval);
  }, [load]);

  if (loading) return <Loading />;
  if (notFound || !item) {
    return (
      <EmptyState
        title="Intervention introuvable"
        text="Elle n'existe pas ou vous n'avez pas les droits pour la consulter."
        action={<Button variant="outline-primary" onClick={() => navigate(-1)}>Retour</Button>}
      />
    );
  }

  const role = user?.role;
  const isStaff = role === 'RESPONSABLE' || role === 'ADMIN';
  const isTech = role === 'TECHNICIEN';
  const isClient = role === 'CLIENT';
  const done = item.statut === 'TERMINEE';

  const handleStart = async () => {
    setBusy('start');
    setError(null);
    try {
      await updateStatut(item.id, 'EN_COURS');
      load();
    } catch (err) {
      setError(apiError(err, 'Erreur lors du démarrage.'));
    } finally {
      setBusy(null);
    }
  };

  const handlePhoto = async (e: React.ChangeEvent<HTMLInputElement>, type: 'avant' | 'apres') => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    setBusy(type);
    setError(null);
    try {
      await uploadPhoto(item.id, type, file);
      load();
    } catch (err) {
      setError(apiError(err, "Erreur lors de l'envoi de la photo."));
    } finally {
      setBusy(null);
    }
  };

  const handlePdf = async () => {
    setBusy('pdf');
    try {
      await downloadPDF(item.id);
    } catch {
      setError('Impossible de télécharger le rapport.');
    } finally {
      setBusy(null);
    }
  };

  const stepDates: Record<string, string | null> = {
    EN_ATTENTE: item.created_at,
    AFFECTEE: item.date_affectation,
    EN_COURS: item.date_debut,
    TERMINEE: item.date_cloture,
  };
  const currentStep = STATUTS.indexOf(item.statut);

  const photoSlot = (type: 'avant' | 'apres') => {
    const url = type === 'avant' ? item.photo_avant_url : item.photo_apres_url;
    const label = type === 'avant' ? 'Avant intervention' : 'Après intervention';
    const canUpload = isTech && item.statut === 'EN_COURS';
    return (
      <div className="photo-slot">
        <div className="photo-label">{label}</div>
        {url ? (
          <a href={url} target="_blank" rel="noreferrer" className="photo-frame">
            <img src={url} alt={label} />
          </a>
        ) : (
          <div className="photo-frame photo-empty">
            <CameraFill />
            <span>Aucune photo</span>
          </div>
        )}
        {canUpload && (
          <label className="btn btn-sm btn-outline-primary mt-2 w-100 mb-0">
            {busy === type ? <Spinner size="sm" animation="border" /> : url ? 'Remplacer la photo' : 'Téléverser la photo'}
            <input type="file" accept="image/*" capture="environment" hidden onChange={(e) => handlePhoto(e, type)} />
          </label>
        )}
      </div>
    );
  };

  return (
    <div className="detail-page">
      <button type="button" className="back-link" onClick={() => navigate(-1)}>
        <ArrowLeft /> Retour
      </button>

      <div className="detail-head">
        <div>
          <div className="page-eyebrow">Intervention #{item.id}</div>
          <h1 className="page-title">{item.type_panne}</h1>
          <div className="d-flex flex-wrap gap-2 align-items-center mt-2">
            <StatutBadge statut={item.statut} />
            <PrioriteBadge priorite={item.priorite} />
            <span className="text-muted small">Créée le {formatDateTime(item.created_at)}</span>
          </div>
        </div>

        <div className="page-actions">
          {isStaff && item.statut === 'EN_ATTENTE' && (
            <Button variant="primary" onClick={() => setModal('assign')}>
              <PersonBadge className="me-2" /> Affecter un technicien
            </Button>
          )}
          {isTech && item.statut === 'AFFECTEE' && (
            <Button variant="primary" disabled={busy === 'start'} onClick={handleStart}>
              {busy === 'start' ? <Spinner size="sm" animation="border" /> : <><PlayFill className="me-1" /> Démarrer</>}
            </Button>
          )}
          {isTech && item.statut === 'EN_COURS' && (
            <Button
              variant="success"
              disabled={!item.photo_avant_url || !item.photo_apres_url}
              title={!item.photo_avant_url || !item.photo_apres_url ? 'Photos avant et après requises' : ''}
              onClick={() => setModal('close')}
            >
              <CheckCircleFill className="me-2" /> Clôturer
            </Button>
          )}
          {isClient && done && !item.avis && (
            <Button variant="primary" onClick={() => setModal('avis')}>
              <StarFill className="me-2" /> Laisser un avis
            </Button>
          )}
          {done && (isClient || isStaff) && (
            <Button variant="outline-primary" disabled={busy === 'pdf'} onClick={handlePdf}>
              {busy === 'pdf' ? <Spinner size="sm" animation="border" /> : <><FileEarmarkPdfFill className="me-2" /> Rapport PDF</>}
            </Button>
          )}
        </div>
      </div>

      {error && <Alert variant="danger" dismissible onClose={() => setError(null)}>{error}</Alert>}
      {isTech && item.statut === 'EN_COURS' && (!item.photo_avant_url || !item.photo_apres_url) && (
        <Alert variant="warning">Ajoutez les photos avant et après intervention pour pouvoir clôturer.</Alert>
      )}

      {/* ----- Progression ----- */}
      <Panel className="mb-4">
        <ol className="stepper">
          {STATUTS.map((s, index) => {
            const reached = index <= currentStep;
            return (
              <li key={s} className={`step ${reached ? 'reached' : ''} ${index === currentStep ? 'current' : ''}`}>
                <span className="step-icon">{reached ? <CheckCircleFill /> : <Circle />}</span>
                <span className="step-label">{statutMeta[s].label}</span>
                <span className="step-date">{reached ? formatDateTime(stepDates[s]) : '—'}</span>
              </li>
            );
          })}
        </ol>
      </Panel>

      <Row className="g-4">
        <Col lg={8}>
          <Panel title="Description de la demande" className="mb-4">
            <p className="detail-text">{item.description}</p>
          </Panel>

          <Panel title="Photos de l'intervention" className="mb-4">
            <Row className="g-3">
              <Col sm={6}>{photoSlot('avant')}</Col>
              <Col sm={6}>{photoSlot('apres')}</Col>
            </Row>
          </Panel>

          <Panel title="Compte-rendu du technicien" className="mb-4">
            {item.compte_rendu ? (
              <p className="detail-text">{item.compte_rendu}</p>
            ) : (
              <p className="text-muted mb-0">Le compte-rendu sera disponible à la clôture de l'intervention.</p>
            )}
          </Panel>

          {done && (
            <Panel title="Avis du client">
              {item.avis ? (
                <div>
                  <div className="stars-readonly">
                    {[1, 2, 3, 4, 5].map((n) => (
                      <StarFill key={n} className={n <= item.avis!.note ? 'on' : ''} />
                    ))}
                    <span className="ms-2 fw-semibold">{item.avis.note}/5</span>
                  </div>
                  {item.avis.commentaire && <p className="detail-text mt-2 mb-0">« {item.avis.commentaire} »</p>}
                  <div className="text-muted small mt-1">{formatDateTime(item.avis.created_at)}</div>
                </div>
              ) : (
                <p className="text-muted mb-0">Aucun avis pour l'instant.</p>
              )}
            </Panel>
          )}
        </Col>

        <Col lg={4}>
          <Panel title="Informations" className="mb-4">
            <dl className="info-list">
              <InfoRow label="Priorité"><PrioriteBadge priorite={item.priorite} /></InfoRow>
              <InfoRow label="Date souhaitée">{formatDate(item.date_souhaitee)}</InfoRow>
              <InfoRow label="Affectée le">{formatDateTime(item.date_affectation)}</InfoRow>
              <InfoRow label="Débutée le">{formatDateTime(item.date_debut)}</InfoRow>
              <InfoRow label="Clôturée le">{formatDateTime(item.date_cloture)}</InfoRow>
              <InfoRow label="Durée">
                {item.duree_resolution_heures !== null ? `${item.duree_resolution_heures} h` : null}
              </InfoRow>
              <InfoRow label="Dernière mise à jour">{formatDateTime(item.updated_at)}</InfoRow>
            </dl>
          </Panel>

          <Panel title="Client" className="mb-4">
            <div className="contact">
              <span className="contact-icon"><PersonFill /></span>
              <div>
                <div className="fw-semibold">{item.client_nom || '—'}</div>
                {item.client_email && (
                  <a href={`mailto:${item.client_email}`} className="contact-line"><Envelope /> {item.client_email}</a>
                )}
                {item.client_telephone && (
                  <a href={`tel:${item.client_telephone}`} className="contact-line"><Telephone /> {item.client_telephone}</a>
                )}
              </div>
            </div>
          </Panel>

          <Panel title="Technicien" className="mb-4">
            {item.technicien_nom ? (
              <div className="contact">
                <span className="contact-icon contact-icon-tech"><Wrench /></span>
                <div>
                  <div className="fw-semibold">{item.technicien_nom}</div>
                  <div className="text-muted small mono">{item.technicien_matricule}</div>
                  {item.technicien_email && (
                    <a href={`mailto:${item.technicien_email}`} className="contact-line"><Envelope /> {item.technicien_email}</a>
                  )}
                  {item.technicien_telephone && (
                    <a href={`tel:${item.technicien_telephone}`} className="contact-line"><Telephone /> {item.technicien_telephone}</a>
                  )}
                  {item.affectee_par_nom && (
                    <div className="text-muted small mt-2">Affectée par {item.affectee_par_nom}</div>
                  )}
                </div>
              </div>
            ) : (
              <p className="text-muted mb-0">
                <ClockHistory className="me-2" />En attente d'affectation par un responsable.
              </p>
            )}
          </Panel>
        </Col>
      </Row>

      <AssignModal
        intervention={modal === 'assign' ? item : null}
        onHide={() => setModal(null)}
        onDone={() => { setModal(null); load(); }}
      />
      <CloseModal
        intervention={modal === 'close' ? item : null}
        onHide={() => setModal(null)}
        onDone={() => { setModal(null); load(); }}
      />
      <AvisModal
        intervention={modal === 'avis' ? item : null}
        onHide={() => setModal(null)}
        onDone={() => { setModal(null); load(); }}
      />
    </div>
  );
}
