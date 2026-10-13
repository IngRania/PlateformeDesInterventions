import { useEffect, useState } from 'react';
import { Row, Col, Table, Spinner, Alert, Button } from 'react-bootstrap';
import { useNavigate } from 'react-router-dom';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';
import api from '../api/axios';
import AdminLayout from '../components/AdminLayout';

interface UserRow {
  id: number;
  email: string;
  first_name: string;
  last_name: string;
  role: string;
  matricule: string | null;
  is_active: boolean;
  created_at: string;
}

const roleLabels: Record<string, string> = {
  ADMIN: 'Administrateur',
  RESPONSABLE: 'Responsable',
  TECHNICIEN: 'Technicien',
  CLIENT: 'Client',
};

const roleColors: Record<string, string> = {
  ADMIN: '#E85D75',
  RESPONSABLE: 'var(--st-encours)',
  TECHNICIEN: 'var(--st-affectee)',
  CLIENT: 'var(--st-terminee)',
};

function Pill({ label, color }: { label: string; color: string }) {
  return (
    <span className="statut-pill" style={{ color, background: `${color}22` }}>
      {label}
    </span>
  );
}

export default function AdminDashboardPage() {
  const navigate = useNavigate();
  const [users, setUsers] = useState<UserRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api
      .get('/auth/users/')
      .then((res) => setUsers(res.data))
      .catch(() => setError('Impossible de charger les utilisateurs.'))
      .finally(() => setLoading(false));
  }, []);

  const countByRole = (role: string) => users.filter((u) => u.role === role).length;

  const chartData = [
    { role: 'Clients', total: countByRole('CLIENT') },
    { role: 'Techniciens', total: countByRole('TECHNICIEN') },
    { role: 'Responsables', total: countByRole('RESPONSABLE') },
    { role: 'Admins', total: countByRole('ADMIN') },
  ];

  const statCards = [
    { label: 'Total comptes', value: users.length, color: 'var(--accent)' },
    { label: 'Clients', value: countByRole('CLIENT'), color: roleColors.CLIENT },
    { label: 'Techniciens', value: countByRole('TECHNICIEN'), color: roleColors.TECHNICIEN },
    { label: 'Responsables', value: countByRole('RESPONSABLE'), color: roleColors.RESPONSABLE },
  ];

  const quickActions = [
    { label: '+ Créer un compte staff', path: '/admin/create-staff' },
    { label: 'Gérer les équipements', path: '/responsable/equipements' },
    { label: 'Voir les interventions', path: '/responsable/interventions' },
    { label: 'Calendrier techniciens', path: '/responsable/calendrier' },
  ];

  return (
    <AdminLayout>
      <div className="page-header d-flex justify-content-between align-items-end flex-wrap gap-3">
        <div>
          <div className="page-eyebrow">SUPERVISION</div>
          <h4 className="fw-bold mb-0">Tableau de bord</h4>
          <p className="text-muted mb-0 mt-1">Vue d'ensemble des comptes et accès rapides</p>
        </div>
        <div className="d-flex gap-2 flex-wrap">
          {quickActions.map((a) => (
            <Button
              key={a.path}
              className={a.path === '/admin/create-staff' ? 'btn-accent' : ''}
              variant={a.path === '/admin/create-staff' ? undefined : 'outline-light'}
              size="sm"
              onClick={() => navigate(a.path)}
            >
              {a.label}
            </Button>
          ))}
        </div>
      </div>

      {error && <Alert variant="danger">{error}</Alert>}

      {loading ? (
        <div className="text-center py-5">
          <Spinner animation="border" style={{ color: 'var(--accent)' }} />
        </div>
      ) : (
        <>
          <Row className="g-3 mb-4">
            {statCards.map((stat) => (
              <Col xs={12} sm={6} lg={3} key={stat.label}>
                <div className="kpi-card" style={{ ['--kpi-color' as any]: stat.color }}>
                  <div className="kpi-label">{stat.label.toUpperCase()}</div>
                  <div className="kpi-value">{stat.value}</div>
                </div>
              </Col>
            ))}
          </Row>

          <Row className="g-3 mb-4">
            <Col xs={12} lg={7}>
              <div className="app-card p-4 h-100">
                <h6 className="fw-bold mb-3">Répartition des comptes par rôle</h6>
                <ResponsiveContainer width="100%" height={260}>
                  <BarChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border)" />
                    <XAxis dataKey="role" fontSize={12} stroke="var(--text-muted)" />
                    <YAxis allowDecimals={false} fontSize={12} stroke="var(--text-muted)" />
                    <Tooltip
                      contentStyle={{
                        background: 'var(--surface-2)',
                        border: '1px solid var(--border)',
                        borderRadius: 8,
                        color: 'var(--text)',
                      }}
                      cursor={{ fill: 'rgba(245, 166, 35, 0.08)' }}
                    />
                    <Bar dataKey="total" fill="var(--accent)" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </Col>

            <Col xs={12} lg={5}>
              <div className="app-card p-4 h-100 d-flex flex-column justify-content-center">
                <h6 className="fw-bold mb-3">Résumé</h6>
                <p className="mb-2">
                  <span className="mono" style={{ color: 'var(--accent)', fontSize: '1.2rem' }}>{users.length}</span>
                  <span className="text-muted"> comptes créés au total</span>
                </p>
                <p className="mb-2">
                  <span className="mono" style={{ color: '#E85D75', fontSize: '1.2rem' }}>
                    {users.filter((u) => !u.is_active).length}
                  </span>
                  <span className="text-muted"> comptes désactivés</span>
                </p>
                <p className="mb-0 text-muted small mt-2">
                  Techniciens (T...) et Responsables (R...) se connectent par matricule.
                </p>
              </div>
            </Col>
          </Row>

          <div className="app-card p-4">
            <h6 className="fw-bold mb-3">Utilisateurs récents</h6>
            <Table responsive hover className="mb-0">
              <thead>
                <tr>
                  <th>Nom</th>
                  <th>Email</th>
                  <th>Matricule</th>
                  <th>Rôle</th>
                  <th>Statut</th>
                </tr>
              </thead>
              <tbody>
                {users.slice(0, 10).map((u) => (
                  <tr key={u.id}>
                    <td className="fw-semibold">{u.first_name} {u.last_name}</td>
                    <td className="small text-muted">{u.email}</td>
                    <td className="mono small">{u.matricule || '—'}</td>
                    <td><Pill label={roleLabels[u.role]} color={roleColors[u.role]} /></td>
                    <td>
                      <Pill
                        label={u.is_active ? 'Actif' : 'Inactif'}
                        color={u.is_active ? 'var(--st-terminee)' : 'var(--text-muted)'}
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </Table>
          </div>
        </>
      )}
    </AdminLayout>
  );
}