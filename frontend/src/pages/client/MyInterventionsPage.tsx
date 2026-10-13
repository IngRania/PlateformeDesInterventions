import { useState } from 'react';
import { Alert, Button } from 'react-bootstrap';
import { useNavigate } from 'react-router-dom';
import { FileEarmarkPdf, PlusLg, StarFill } from 'react-bootstrap-icons';
import { downloadPDF, Intervention } from '../../api/interventions';
import { useInterventions } from '../../hooks/useData';
import InterventionsTable from '../../components/InterventionsTable';
import { AvisModal } from '../../components/InterventionModals';
import { PageHeader } from '../../components/ui';

export default function MyInterventionsPage() {
  const navigate = useNavigate();
  const { items, loading, error, reload } = useInterventions();
  const [rating, setRating] = useState<Intervention | null>(null);

  return (
    <>
      <PageHeader
        eyebrow="Espace client"
        title="Mes interventions"
        subtitle="Suivez l'avancement et l'historique de toutes vos demandes."
        actions={
          <Button variant="primary" onClick={() => navigate('/client/nouvelle-demande')}>
            <PlusLg className="me-2" /> Nouvelle demande
          </Button>
        }
      />
      {error && <Alert variant="danger">{error}</Alert>}
      <InterventionsTable
        items={items}
        loading={loading}
        detailBase="/client/interventions"
        columns={['technicien']}
        emptyAction={
          <Button variant="primary" onClick={() => navigate('/client/nouvelle-demande')}>Créer ma première demande</Button>
        }
        renderActions={(i) => i.statut === 'TERMINEE' && (
          <>
            <Button size="sm" variant="outline-secondary" onClick={() => downloadPDF(i.id)} title="Télécharger le rapport PDF">
              <FileEarmarkPdf />
            </Button>
            {i.avis ? (
              <span className="rating-chip"><StarFill /> {i.avis.note}/5</span>
            ) : (
              <Button size="sm" variant="outline-warning" onClick={() => setRating(i)}>
                <StarFill className="me-1" /> Avis
              </Button>
            )}
          </>
        )}
      />
      <AvisModal intervention={rating} onHide={() => setRating(null)} onDone={() => { setRating(null); reload(); }} />
    </>
  );
}
