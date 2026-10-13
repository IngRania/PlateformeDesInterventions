import { Alert, Button, Col, Row } from 'react-bootstrap';
import { useNavigate } from 'react-router-dom';
import {
  CalendarCheck, CheckCircleFill, ExclamationTriangleFill, GeoAltFill, PlayCircleFill, StarFill, Stopwatch,
} from 'react-bootstrap-icons';
import { useAuth } from '../../context/AuthContext';
import { useLocationSharing } from '../../context/LocationContext';
import { useDashboard } from '../../hooks/useData';
import { KpiCard, Loading, PageHeader } from '../../components/ui';
import { MonthlyPanel, PriorityPanel, RecentPanel, StatusPanel } from '../../components/DashboardWidgets';

export default function TechnicienDashboardPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const sharing = useLocationSharing();
  const { data, error } = useDashboard();

  return (
    <>
      <PageHeader
        eyebrow="Espace technicien"
        title={`Bonjour ${user?.first_name ?? ''}`}
        subtitle="Vos interventions du jour et votre activité."
        actions={
          <Button variant="primary" onClick={() => navigate('/technicien/mes-taches')}>Voir mes tâches</Button>
        }
      />
      {error && <Alert variant="danger">{error}</Alert>}
      {sharing && sharing.status !== 'active' && sharing.status !== 'pending' && (
        <Alert variant="warning" className="d-flex align-items-center justify-content-between flex-wrap gap-2">
          <span><GeoAltFill className="me-2" />Votre position n'est pas partagée avec le responsable.</span>
          <Button size="sm" variant="outline-dark" onClick={() => navigate('/technicien/position')}>Gérer</Button>
        </Alert>
      )}
      {!data ? <Loading /> : (
        <>
          <Row className="g-3 mb-4">
            <Col xs={6} lg={3}>
              <KpiCard label="À démarrer" value={data.par_statut.AFFECTEE} icon={PlayCircleFill} color="#2563EB"
                onClick={() => navigate('/technicien/mes-taches?statut=AFFECTEE')} />
            </Col>
            <Col xs={6} lg={3}>
              <KpiCard label="En cours" value={data.par_statut.EN_COURS} icon={Stopwatch} color="#D97706"
                onClick={() => navigate('/technicien/mes-taches?statut=EN_COURS')} />
            </Col>
            <Col xs={6} lg={3}>
              <KpiCard label="Prévues aujourd'hui" value={data.prevues_aujourdhui} icon={CalendarCheck} color="#0EA5E9"
                hint={data.en_retard ? <span className="text-danger"><ExclamationTriangleFill /> {data.en_retard} en retard</span> : 'Aucun retard'} />
            </Col>
            <Col xs={6} lg={3}>
              <KpiCard label="Terminées" value={data.par_statut.TERMINEE} icon={CheckCircleFill} color="#16A34A"
                hint={
                  <>
                    {data.temps_moyen_resolution_heures !== null && `${data.temps_moyen_resolution_heures} h en moy.`}
                    {data.note_moyenne && <> · <StarFill className="text-warning" /> {data.note_moyenne}/5</>}
                  </>
                } />
            </Col>
          </Row>
          <Row className="g-3 mb-4">
            <Col lg={7}>
              <RecentPanel items={data.recentes} detailBase="/technicien/interventions" listPath="/technicien/mes-taches" title="Mes dernières tâches" />
            </Col>
            <Col lg={5}>
              <PriorityPanel data={data} />
            </Col>
          </Row>
          <Row className="g-3">
            <Col lg={5}><StatusPanel data={data} listPath="/technicien/mes-taches" /></Col>
            <Col lg={7}><MonthlyPanel data={data} /></Col>
          </Row>
        </>
      )}
    </>
  );
}
