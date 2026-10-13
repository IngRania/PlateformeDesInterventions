import { useState } from 'react';
import { Alert, Button, Spinner } from 'react-bootstrap';
import { CheckCircleFill, PlayFill } from 'react-bootstrap-icons';
import { Intervention, updateStatut } from '../../api/interventions';
import { useInterventions } from '../../hooks/useData';
import InterventionsTable from '../../components/InterventionsTable';
import { CloseModal } from '../../components/InterventionModals';
import { PageHeader } from '../../components/ui';
import { apiError } from '../../utils/format';

export default function MyTasksPage() {
  const { items, loading, error: loadError, reload } = useInterventions(5000);
  const [error, setError] = useState<string | null>(null);
  const [starting, setStarting] = useState<number | null>(null);
  const [closing, setClosing] = useState<Intervention | null>(null);

  const start = async (i: Intervention) => {
    setStarting(i.id);
    setError(null);
    try {
      await updateStatut(i.id, 'EN_COURS');
      reload();
    } catch (err) {
      setError(apiError(err, 'Erreur lors du démarrage.'));
    } finally {
      setStarting(null);
    }
  };

  return (
    <>
      <PageHeader
        eyebrow="Espace technicien"
        title="Mes tâches"
        subtitle="Ouvrez le détail d'une intervention pour téléverser les photos avant / après et la clôturer."
      />
      {(error || loadError) && <Alert variant="danger" dismissible onClose={() => setError(null)}>{error || loadError}</Alert>}
      <InterventionsTable
        items={items}
        loading={loading}
        detailBase="/technicien/interventions"
        columns={['client', 'description']}
        renderActions={(i) => (
          <>
            {i.statut === 'AFFECTEE' && (
              <Button size="sm" variant="primary" disabled={starting === i.id} onClick={() => start(i)}>
                {starting === i.id ? <Spinner size="sm" animation="border" /> : <><PlayFill /> Démarrer</>}
              </Button>
            )}
            {i.statut === 'EN_COURS' && (
              <Button
                size="sm"
                variant="success"
                disabled={!i.photo_avant_url || !i.photo_apres_url}
                title={!i.photo_avant_url || !i.photo_apres_url ? 'Photos avant et après requises (voir Détails)' : ''}
                onClick={() => setClosing(i)}
              >
                <CheckCircleFill className="me-1" /> Clôturer
              </Button>
            )}
          </>
        )}
      />
      <CloseModal
        intervention={closing}
        onHide={() => setClosing(null)}
        onDone={() => { setClosing(null); reload(); }}
      />
    </>
  );
}
