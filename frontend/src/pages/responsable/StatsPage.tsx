import { useEffect, useState } from 'react';
import { Container, Navbar, Button, Spinner, Row, Col } from 'react-bootstrap';
import { useNavigate } from 'react-router-dom';
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';
import { getStats, Stats } from '../../api/interventions';
import { useAuth } from '../../context/AuthContext';

const statutMeta: Record<string, { label: string; color: string }> = {
  EN_ATTENTE: { label: 'En attente', color: 'var(--st-attente)' },
  AFFECTEE: { label: 'Affectée', color: 'var(--st-affectee)' },
  EN_COURS: { label: 'En cours', color: 'var(--st-encours)' },
  TERMINEE: { label: 'Terminée', color: 'var(--st-terminee)' },
};

export default function StatsPage() {
  const navigate = useNavigate();
  const { logout } = useAuth();
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getStats().then((res) => setStats(res.data)).finally(() => setLoading(false));
  }, []);

  return (
    <div>
      <Navbar className="app-navbar px-4 py-3">
        <div>
          <div className="mono" style={{ color: 'var(--accent)', fontSize: '0.72rem' }}>STATISTIQUES</div>
          <div style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: '1.1rem' }}>
            Tableau de bord
          </div>
        </div>
        <div className="ms-auto d-flex gap-2">
          <Button variant="outline-light" size="sm" onClick={() => navigate('/responsable/interventions')}>
            Demandes
          </Button>
          <Button variant="outline-light" size="sm" onClick={() => { logout(); navigate('/login'); }}>
            Déconnexion
          </Button>
        </div>
      </Navbar>

      <Container className="py-5">
        {loading || !stats ? (
          <Spinner animation="border" style={{ color: 'var(--accent)' }} />
        ) : (
          <>
            <Row className="g-3 mb-4">
              <Col xs={6} md={3}>
                <div className="kpi-card">
                  <div className="kpi-label">TOTAL INTERVENTIONS</div>
                  <div className="kpi-value">{stats.total_interventions}</div>
                </div>
              </Col>
              <Col xs={6} md={3}>
                <div className="kpi-card" style={{ ['--kpi-color' as any]: 'var(--st-terminee)' }}>
                  <div className="kpi-label">TEMPS MOYEN RÉSOLUTION</div>
                  <div className="kpi-value">
                    {stats.temps_moyen_resolution_heures !== null ? `${stats.temps_moyen_resolution_heures}h` : '—'}
                  </div>
                </div>
              </Col>
              {stats.par_statut.map((s) => (
                <Col xs={6} md={3} key={s.statut}>
                  <div className="kpi-card" style={{ ['--kpi-color' as any]: statutMeta[s.statut]?.color }}>
                    <div className="kpi-label">{statutMeta[s.statut]?.label.toUpperCase() || s.statut}</div>
                    <div className="kpi-value">{s.total}</div>
                  </div>
                </Col>
              ))}
            </Row>

            <Row className="g-3 mb-4">
              <Col xs={12} lg={6}>
                <div className="app-card p-4">
                  <h6 className="fw-bold mb-3">Interventions par technicien</h6>
                  <ResponsiveContainer width="100%" height={260}>
                    <BarChart data={stats.par_technicien.map((t) => ({
                      name: t.technicien__matricule,
                      total: t.total,
                    }))}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border)" />
                      <XAxis dataKey="name" fontSize={12} stroke="var(--text-muted)" />
                      <YAxis allowDecimals={false} fontSize={12} stroke="var(--text-muted)" />
                      <Tooltip contentStyle={{ background: 'var(--surface-2)', border: '1px solid var(--border)', borderRadius: 8 }} />
                      <Bar dataKey="total" fill="var(--accent)" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </Col>

              <Col xs={12} lg={6}>
                <div className="app-card p-4">
                  <h6 className="fw-bold mb-3">Interventions par mois</h6>
                  <ResponsiveContainer width="100%" height={260}>
                    <LineChart data={stats.par_mois}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border)" />
                      <XAxis dataKey="mois" fontSize={12} stroke="var(--text-muted)" />
                      <YAxis allowDecimals={false} fontSize={12} stroke="var(--text-muted)" />
                      <Tooltip contentStyle={{ background: 'var(--surface-2)', border: '1px solid var(--border)', borderRadius: 8 }} />
                      <Line type="monotone" dataKey="total" stroke="var(--st-affectee)" strokeWidth={2} dot={{ fill: 'var(--st-affectee)' }} />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </Col>
            </Row>
          </>
        )}
      </Container>
    </div>
  );
}