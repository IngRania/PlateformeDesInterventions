import { useState } from 'react';
import { Alert, Button } from 'react-bootstrap';
import { FileEarmarkPdf, PersonBadge } from 'react-bootstrap-icons';
import { downloadPDF, Intervention } from '../../api/interventions';
import { useInterventions } from '../../hooks/useData';
import InterventionsTable from '../../components/InterventionsTable';
import { AssignModal } from '../../components/InterventionModals';
import { PageHeader } from '../../components/ui';

export default function InterventionsListPage() {
  const { items, loading, error, reload } = useInterventions(5000);
  const [toAssign, setToAssign] = useState<Intervention | null>(null);
  const pending = items.filter((i) => i.statut === 'EN_ATTENTE').length;

  return (
    <>
      <PageHeader
        eyebrow="Responsable maintenance"
        title="Demandes d'intervention"
        subtitle={pending ? `${pending} demande${pending > 1 ? 's' : ''} en attente d'affectation` : 'Toutes les demandes sont affectées.'}
      />
      {error && <Alert variant="danger">{error}</Alert>}
      <InterventionsTable
        items={items}
        loading={loading}
        detailBase="/responsable/interventions"
        renderActions={(i) => (
          <>
            {i.statut === 'EN_ATTENTE' && (
              <Button size="sm" variant="primary" onClick={() => setToAssign(i)}>
                <PersonBadge className="me-1" /> Affecter
              </Button>
            )}
            {i.statut === 'TERMINEE' && (
              <Button size="sm" variant="outline-secondary" onClick={() => downloadPDF(i.id)} title="Rapport PDF">
                <FileEarmarkPdf />
              </Button>
            )}
          </>
        )}
      />
      <AssignModal
        intervention={toAssign}
        onHide={() => setToAssign(null)}
        onDone={() => { setToAssign(null); reload(); }}
      />
    </>
  );
}
