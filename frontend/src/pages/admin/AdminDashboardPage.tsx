import { useEffect, useState } from 'react';
import { Alert, Button, Col, Row } from 'react-bootstrap';
import { useNavigate } from 'react-router-dom';
import {
  ClipboardCheckFill, ListTask, PeopleFill, PersonPlusFill, PersonXFill, StarFill, Stopwatch, Wrench,
} from 'react-bootstrap-icons';
import { useDashboard } from '../../hooks/useData';
import { listUsers, UserRow } from '../../api/users';
import { KpiCard, Loading, PageHeader, Panel } from '../../components/ui';
import { BarList, MonthlyPanel, RecentPanel, StatusPanel } from '../../components/DashboardWidgets';
import { formatDate, initials, roleLabels } from '../../utils/format';

const roleColors: Record<string, string> = {
  CLIENT: '#2563EB', TECHNICIEN: '#16A34A', RESPONSABLE: '#D97706', ADMIN: '#DC2626',
};

export default function AdminDashboardPage() {
  const navigate = useNavigate();
  const { data, error } = useDashboard();
  const [users, setUsers] = useState<UserRow[]>([]);

  useEffect(() => {
    listUsers().then((res) => setUsers(res.data)).catch(() => undefined);
  }, []);

  const parRole = data?.utilisateurs?.par_role ?? {};

  return (
    <>
      <PageHeader
        eyebrow="Administration"
        title="Vue d'ensemble globale"
        subtitle="Comptes, activité de maintenance et qualité de service sur toute la plateforme."
        actions={
          <>
            <Button variant="outline-primary" onClick={() => navigate('/responsable/dashboard')}>
              <ClipboardCheckFill className="me-2" /> Espace responsable
            </Button>
            <Button variant="primary" onClick={() => navigate('/admin/create-staff')}>
              <PersonPlusFill className="me-2" /> Créer un compte
            </Button>
          </>
        }
      />
      {error && <Alert variant="danger">{error}</Alert>}
      {!data ? <Loading /> : (
        <>
          <Row className="g-3 mb-4">
            <Col xs={6} xl={3}>
              <KpiCard label="Comptes utilisateurs" value={data.utilisateurs?.total ?? 0} icon={PeopleFill}
                hint={`${data.utilisateurs?.inactifs ?? 0} désactivé(s)`} onClick={() => navigate('/admin/utilisateurs')} />
            </Col>
            <Col xs={6} xl={3}>
              <KpiCard label="Interventions" value={data.total} icon={ListTask} color="#0EA5E9"
                hint={`${data.par_statut.EN_ATTENTE} en attente d'affectation`} />
            </Col>
            <Col xs={6} xl={3}>
              <KpiCard label="Temps moyen de résolution"
                value={data.temps_moyen_resolution_heures !== null ? `${data.temps_moyen_resolution_heures} h` : '—'}
                icon={Stopwatch} color="#D97706" hint={`${data.taux_resolution} % terminées`} />
            </Col>
            <Col xs={6} xl={3}>
              <KpiCard label="Satisfaction client" value={data.note_moyenne ? `${data.note_moyenne}/5` : '—'}
                icon={StarFill} color="#16A34A" hint={`${data.nb_avis} avis`} />
            </Col>
          </Row>

          <Row className="g-3 mb-4">
            <Col lg={4}>
              <Panel title="Comptes par rôle" className="h-100">
                <BarList
                  total={data.utilisateurs?.total ?? 0}
                  rows={['CLIENT', 'TECHNICIEN', 'RESPONSABLE', 'ADMIN'].map((r) => ({
                    key: r,
                    label: roleLabels[r],
                    value: parRole[r] ?? 0,
                    color: roleColors[r],
                    onClick: () => navigate(`/admin/utilisateurs?role=${r}`),
                  }))}
                />
              </Panel>
            </Col>
            <Col lg={4}><StatusPanel data={data} listPath="/responsable/interventions" /></Col>
            <Col lg={4}>
              <Panel
                title="Derniers comptes créés"
                className="h-100"
                flush
                actions={<button type="button" className="link-btn" onClick={() => navigate('/admin/utilisateurs')}>Tout voir</button>}
              >
                <ul className="recent-list">
                  {users.slice(0, 5).map((u) => (
                    <li key={u.id} onClick={() => navigate(`/admin/utilisateurs?q=${encodeURIComponent(u.email)}`)}>
                      <div className="d-flex align-items-center gap-2 recent-main">
                        <span className="avatar-sm">{initials(u.first_name, u.last_name)}</span>
                        <div>
                          <div className="fw-semibold">{u.first_name} {u.last_name}</div>
                          <div className="cell-sub">{roleLabels[u.role]} · {formatDate(u.created_at)}</div>
                        </div>
                      </div>
                      {!u.is_active && <PersonXFill className="text-danger" title="Désactivé" />}
                    </li>
                  ))}
                </ul>
              </Panel>
            </Col>
          </Row>

          <Row className="g-3">
            <Col lg={7}><MonthlyPanel data={data} /></Col>
            <Col lg={5}>
              <RecentPanel items={data.recentes.slice(0, 5)} detailBase="/responsable/interventions" listPath="/responsable/interventions" />
            </Col>
          </Row>
          <p className="text-muted small mt-3 mb-0">
            <Wrench className="me-1" /> Les techniciens et responsables se connectent avec leur matricule (T0001, R0001).
          </p>
        </>
      )}
    </>
  );
}
