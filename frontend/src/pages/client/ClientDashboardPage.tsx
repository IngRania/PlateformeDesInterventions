import { Alert, Button, Col, Row } from 'react-bootstrap';
import { useNavigate } from 'react-router-dom';
import {
  CheckCircleFill, ClockFill, HourglassSplit, PlusLg, StarFill, ListTask,
} from 'react-bootstrap-icons';
import { useAuth } from '../../context/AuthContext';
import { useDashboard } from '../../hooks/useData';
import { KpiCard, Loading, PageHeader } from '../../components/ui';
import { MonthlyPanel, RecentPanel, StatusPanel } from '../../components/DashboardWidgets';

export default function ClientDashboardPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { data, error } = useDashboard();

  return (
    <>
      <PageHeader
        eyebrow="Espace client"
        title={`Bonjour ${user?.first_name ?? ''}`}
        subtitle="Suivez l'avancement de vos demandes d'intervention en un coup d'œil."
        actions={
          <Button variant="primary" onClick={() => navigate('/client/nouvelle-demande')}>
            <PlusLg className="me-2" /> Nouvelle demande
          </Button>
        }
      />
      {error && <Alert variant="danger">{error}</Alert>}
      {!data ? <Loading /> : (
        <>
          <Row className="g-3 mb-4">
            <Col xs={6} lg={3}>
              <KpiCard label="Total demandes" value={data.total} icon={ListTask}
                onClick={() => navigate('/client/mes-interventions')} />
            </Col>
            <Col xs={6} lg={3}>
              <KpiCard label="En attente" value={data.par_statut.EN_ATTENTE} icon={HourglassSplit} color="#64748B"
                hint="En cours d'affectation" onClick={() => navigate('/client/mes-interventions?statut=EN_ATTENTE')} />
            </Col>
            <Col xs={6} lg={3}>
              <KpiCard label="En traitement" value={data.par_statut.AFFECTEE + data.par_statut.EN_COURS}
                icon={ClockFill} color="#D97706" hint="Technicien affecté ou sur place" />
            </Col>
            <Col xs={6} lg={3}>
              <KpiCard label="Terminées" value={data.par_statut.TERMINEE} icon={CheckCircleFill} color="#16A34A"
                hint={data.note_moyenne ? <><StarFill className="text-warning" /> {data.note_moyenne}/5 donnée en moyenne</> : `${data.taux_resolution} % résolues`}
                onClick={() => navigate('/client/mes-interventions?statut=TERMINEE')} />
            </Col>
          </Row>
          <Row className="g-3 mb-4">
            <Col lg={7}>
              <RecentPanel items={data.recentes} detailBase="/client/interventions" listPath="/client/mes-interventions" title="Mes dernières demandes" />
            </Col>
            <Col lg={5}>
              <StatusPanel data={data} listPath="/client/mes-interventions" />
            </Col>
          </Row>
          <Row className="g-3">
            <Col xs={12}><MonthlyPanel data={data} /></Col>
          </Row>
        </>
      )}
    </>
  );
}
