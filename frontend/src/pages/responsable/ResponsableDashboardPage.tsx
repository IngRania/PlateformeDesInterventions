import { Alert, Button, Col, Row } from 'react-bootstrap';
import { useNavigate } from 'react-router-dom';
import {
  ExclamationTriangleFill, GeoAltFill, HourglassSplit, ListTask, PeopleFill, StarFill, Stopwatch, CalendarWeek,
} from 'react-bootstrap-icons';
import { useDashboard } from '../../hooks/useData';
import { KpiCard, Loading, PageHeader } from '../../components/ui';
import {
  MonthlyPanel, PriorityPanel, RecentPanel, StatusPanel, TechniciansPanel,
} from '../../components/DashboardWidgets';

export default function ResponsableDashboardPage() {
  const navigate = useNavigate();
  const { data, error } = useDashboard();

  return (
    <>
      <PageHeader
        eyebrow="Responsable maintenance"
        title="Tableau de bord"
        subtitle="Indicateurs clés (KPI) de l'activité de maintenance."
        actions={
          <>
            <Button variant="outline-primary" onClick={() => navigate('/responsable/calendrier')}>
              <CalendarWeek className="me-2" /> Calendrier
            </Button>
            <Button variant="primary" onClick={() => navigate('/responsable/interventions?statut=EN_ATTENTE')}>
              Traiter les demandes
            </Button>
          </>
        }
      />
      {error && <Alert variant="danger">{error}</Alert>}
      {!data ? <Loading /> : (
        <>
          <Row className="g-3 mb-4">
            <Col xs={6} xl={3}>
              <KpiCard label="Demandes en attente" value={data.par_statut.EN_ATTENTE} icon={HourglassSplit} color="#64748B"
                hint="À affecter" onClick={() => navigate('/responsable/interventions?statut=EN_ATTENTE')} />
            </Col>
            <Col xs={6} xl={3}>
              <KpiCard label="Urgentes / hautes ouvertes" value={data.urgentes_ouvertes} icon={ExclamationTriangleFill}
                color="#DC2626" hint={`${data.en_retard} en retard sur la date souhaitée`} />
            </Col>
            <Col xs={6} xl={3}>
              <KpiCard label="Temps moyen de résolution"
                value={data.temps_moyen_resolution_heures !== null ? `${data.temps_moyen_resolution_heures} h` : '—'}
                icon={Stopwatch} color="#D97706" hint={`${data.taux_resolution} % des interventions terminées`} />
            </Col>
            <Col xs={6} xl={3}>
              <KpiCard label="Satisfaction client" value={data.note_moyenne ? `${data.note_moyenne}/5` : '—'}
                icon={StarFill} color="#16A34A" hint={`${data.nb_avis} avis reçu${data.nb_avis > 1 ? 's' : ''}`} />
            </Col>
            <Col xs={6} xl={3}>
              <KpiCard label="Total interventions" value={data.total} icon={ListTask}
                onClick={() => navigate('/responsable/interventions')} />
            </Col>
            <Col xs={6} xl={3}>
              <KpiCard label="Prévues aujourd'hui" value={data.prevues_aujourdhui} icon={CalendarWeek} color="#0EA5E9"
                onClick={() => navigate('/responsable/calendrier')} />
            </Col>
            <Col xs={6} xl={3}>
              <KpiCard label="Techniciens disponibles" value={`${data.techniciens?.disponibles ?? 0}/${data.techniciens?.total ?? 0}`}
                icon={PeopleFill} color="#2563EB" hint="Sans intervention en cours" />
            </Col>
            <Col xs={6} xl={3}>
              <KpiCard label="Techniciens localisés" value={data.techniciens?.localises ?? 0} icon={GeoAltFill}
                color="#16A34A" hint="Position < 10 min" onClick={() => navigate('/responsable/tracking')} />
            </Col>
          </Row>
          <Row className="g-3 mb-4">
            <Col lg={7}><MonthlyPanel data={data} /></Col>
            <Col lg={5}><StatusPanel data={data} listPath="/responsable/interventions" /></Col>
          </Row>
          <Row className="g-3">
            <Col lg={4}><PriorityPanel data={data} /></Col>
            <Col lg={4}><TechniciansPanel data={data} /></Col>
            <Col lg={4}>
              <RecentPanel items={data.recentes.slice(0, 5)} detailBase="/responsable/interventions" listPath="/responsable/interventions" />
            </Col>
          </Row>
        </>
      )}
    </>
  );
}
