import { useEffect, useMemo, useState } from 'react';
import { Container, Navbar, Button, ButtonGroup, Spinner, Form, Row, Col, Alert } from 'react-bootstrap';
import { ChevronLeft, ChevronRight } from 'react-bootstrap-icons';
import { useNavigate } from 'react-router-dom';
import { getCalendar } from '../../api/interventions';
import { useAuth } from '../../context/AuthContext';

type View = 'week' | 'day';
interface DayCol { date: string; label: string; }

/* ---------- Dates (toujours en heure LOCALE) ----------
   L'ancienne version utilisait toISOString(), qui convertit en UTC :
   en Tunisie (UTC+1) chaque colonne portait la date de la veille. */
function toKey(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function startOfWeek(date: Date): Date {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  const day = d.getDay();
  d.setDate(d.getDate() + (day === 0 ? -6 : 1 - day)); // lundi = premier jour
  return d;
}

function buildDays(anchor: Date, view: View): DayCol[] {
  const count = view === 'week' ? 7 : 1;
  const first = view === 'week' ? startOfWeek(anchor) : new Date(anchor);
  const days: DayCol[] = [];
  for (let i = 0; i < count; i++) {
    const d = new Date(first);
    d.setDate(first.getDate() + i);
    days.push({
      date: toKey(d),
      label:
        view === 'week'
          ? d.toLocaleDateString('fr-FR', { weekday: 'short', day: 'numeric', month: 'short' })
          : d.toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }),
    });
  }
  return days;
}

/* La date peut arriver en "2026-10-01" ou en "2026-10-01T09:00:00" : on garde les 10 premiers caractères.
   - tâche terminée  : placée à sa date de clôture (ce qui a été fait)
   - tâche à faire   : placée à sa date planifiée / souhaitée (ce qui reste à faire)
   - sinon           : date de début ou de création, pour qu'aucune tâche ne disparaisse */
function dayOf(i: any): string {
  // Le backend envoie `date_calendrier` (date déjà choisie selon le statut) : on la prend en priorité.
  if (i.date_calendrier) return String(i.date_calendrier).slice(0, 10);

  const done = /TERMIN|CLOT/i.test(String(i.statut ?? ''));
  const raw = done
    ? i.date_cloture ?? i.date_planifiee ?? i.date_souhaitee ?? i.created_at ?? i.date_creation
    : i.date_planifiee ?? i.date_souhaitee ?? i.date_debut ?? i.created_at ?? i.date_creation;
  return String(raw ?? '').slice(0, 10);
}

/* ---------- Couleurs / libellés ---------- */
const prioriteColors: Record<string, string> = {
  BASSE: '#8B96A5',
  NORMALE: '#4C8DFF',
  HAUTE: '#F5A623',
  URGENTE: '#E85D75',
};

function statusMeta(statut: string) {
  const s = String(statut || '').toUpperCase();
  if (s.includes('ATTENTE')) return { label: 'En attente', color: '#8B96A5' };
  if (s.includes('AFFECT')) return { label: 'Affectée', color: '#4C8DFF' };
  if (s.includes('COURS')) return { label: 'En cours', color: '#F5A623' };
  if (s.includes('TERMIN') || s.includes('CLOT')) return { label: 'Terminée', color: '#3DDC84' };
  return { label: statut || '—', color: '#8B96A5' };
}

function techName(t: any): string {
  return `${t.first_name ?? ''} ${t.last_name ?? ''}`.trim();
}

export default function CalendarPage() {
  const navigate = useNavigate();
  const { logout } = useAuth();

  const [view, setView] = useState<View>('week');
  const [anchor, setAnchor] = useState<Date>(new Date());
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [techFilter, setTechFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [clientFilter, setClientFilter] = useState('');

  const days = useMemo(() => buildDays(anchor, view), [anchor, view]);
  const start = days[0].date;
  const end = days[days.length - 1].date;
  const todayKey = toKey(new Date());

  /* Chargement + rafraîchissement automatique (sans clignotement du spinner) */
  useEffect(() => {
    let cancelled = false;

    const load = (initial: boolean) => {
      if (initial) setLoading(true);
      getCalendar(start, end)
        .then((res) => {
          if (cancelled) return;
          setData(Array.isArray(res.data) ? res.data : []);
          setError(null);
        })
        .catch(() => {
          if (!cancelled) setError('Impossible de charger le planning.');
        })
        .finally(() => {
          if (!cancelled && initial) setLoading(false);
        });
    };

    load(true);
    const interval = setInterval(() => load(false), 10000);
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, [start, end]);

  /* Navigation */
  const shift = (delta: number) => {
    const d = new Date(anchor);
    d.setDate(d.getDate() + delta * (view === 'week' ? 7 : 1));
    setAnchor(d);
  };

  /* Options de filtres, déduites des données reçues */
  const technicians = useMemo(() => data.map((r) => r.technicien), [data]);

  const allInterventions = useMemo(
    () => data.flatMap((r) => r.interventions ?? []),
    [data]
  );

  const statuses = useMemo(() => {
    const set = new Set<string>(allInterventions.map((i: any) => i.statut).filter(Boolean));
    if (statusFilter) set.add(statusFilter);
    return Array.from(set);
  }, [allInterventions, statusFilter]);

  const clients = useMemo(() => {
    const set = new Set<string>(allInterventions.map((i: any) => i.client_nom).filter(Boolean));
    if (clientFilter) set.add(clientFilter);
    return Array.from(set).sort((a, b) => a.localeCompare(b, 'fr'));
  }, [allInterventions, clientFilter]);

  /* Application des filtres */
  const rows = useMemo(
    () =>
      data
        .filter((r) => !techFilter || String(r.technicien.id) === techFilter)
        .map((r) => ({
          ...r,
          interventions: (r.interventions ?? []).filter(
            (i: any) =>
              (!statusFilter || i.statut === statusFilter) &&
              (!clientFilter || i.client_nom === clientFilter)
          ),
        })),
    [data, techFilter, statusFilter, clientFilter]
  );

  const visibleKeys = days.map((d) => d.date);
  const visibleItems = rows.flatMap((r) =>
    r.interventions.filter((i: any) => visibleKeys.includes(dayOf(i)))
  );
  const totalVisible = visibleItems.length;
  const doneVisible = visibleItems.filter(
    (i: any) => statusMeta(i.statut).label === 'Terminée'
  ).length;

  const hasFilters = !!(techFilter || statusFilter || clientFilter);
  const resetFilters = () => {
    setTechFilter('');
    setStatusFilter('');
    setClientFilter('');
  };

  const periodLabel =
    view === 'week'
      ? `${new Date(start + 'T00:00:00').toLocaleDateString('fr-FR', { day: 'numeric', month: 'long' })} – ${new Date(
          end + 'T00:00:00'
        ).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })}`
      : days[0].label;

  return (
    <div>
      <Navbar className="px-4 py-3" bg="dark" variant="dark">
        <Navbar.Brand className="fw-bold">Espace Responsable</Navbar.Brand>
        <div className="ms-auto d-flex gap-2 flex-wrap">
          <Button variant="outline-light" size="sm" onClick={() => navigate('/responsable/interventions')}>
            Demandes
          </Button>
          <Button variant="outline-light" size="sm" onClick={() => navigate('/responsable/equipements')}>
            Équipements
          </Button>
          <Button variant="outline-light" size="sm" onClick={() => navigate('/responsable/tracking')}>
            Localisation
          </Button>
          <Button
            variant="outline-light"
            size="sm"
            onClick={() => {
              logout();
              navigate('/staff-login');
            }}
          >
            Déconnexion
          </Button>
        </div>
      </Navbar>

      <Container fluid className="py-4 px-4">
        {/* ----- Titre + vue + navigation ----- */}
        <div className="d-flex flex-wrap justify-content-between align-items-center gap-3 mb-3">
          <div>
            <h4 className="fw-bold mb-1">Planning des interventions</h4>
            <div className="text-muted small">{periodLabel}</div>
          </div>

          <div className="d-flex flex-wrap gap-2">
            <ButtonGroup size="sm">
              <Button
                variant={view === 'week' ? 'primary' : 'outline-light'}
                onClick={() => setView('week')}
              >
                Semaine
              </Button>
              <Button
                variant={view === 'day' ? 'primary' : 'outline-light'}
                onClick={() => setView('day')}
              >
                Jour
              </Button>
            </ButtonGroup>

            <ButtonGroup size="sm">
              <Button variant="outline-light" onClick={() => shift(-1)} aria-label="Période précédente">
                <ChevronLeft />
              </Button>
              <Button variant="outline-light" onClick={() => setAnchor(new Date())}>
                Aujourd'hui
              </Button>
              <Button variant="outline-light" onClick={() => shift(1)} aria-label="Période suivante">
                <ChevronRight />
              </Button>
            </ButtonGroup>
          </div>
        </div>

        {/* ----- Filtres ----- */}
        <Row className="g-3 mb-3 align-items-end">
          <Col xs={12} sm={6} lg={3}>
            <Form.Label>Technicien</Form.Label>
            <Form.Select value={techFilter} onChange={(e) => setTechFilter(e.target.value)}>
              <option value="">Tous les techniciens</option>
              {technicians.map((t) => (
                <option key={t.id} value={String(t.id)}>
                  {[t.matricule, techName(t)].filter(Boolean).join(' · ')}
                </option>
              ))}
            </Form.Select>
          </Col>

          <Col xs={12} sm={6} lg={3}>
            <Form.Label>Statut</Form.Label>
            <Form.Select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
              <option value="">Tous les statuts</option>
              {statuses.map((s) => (
                <option key={s} value={s}>
                  {statusMeta(s).label}
                </option>
              ))}
            </Form.Select>
          </Col>

          <Col xs={12} sm={6} lg={3}>
            <Form.Label>Client</Form.Label>
            <Form.Select value={clientFilter} onChange={(e) => setClientFilter(e.target.value)}>
              <option value="">Tous les clients</option>
              {clients.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </Form.Select>
          </Col>

          <Col xs={12} sm={6} lg={3} className="d-flex align-items-center gap-3">
            <Button variant="outline-light" size="sm" onClick={resetFilters} disabled={!hasFilters}>
              Réinitialiser
            </Button>
            <span className="text-muted small">
              {totalVisible - doneVisible} à faire, {doneVisible} terminée{doneVisible > 1 ? 's' : ''}
            </span>
          </Col>
        </Row>

        {/* ----- Légende des priorités ----- */}
        <div className="d-flex flex-wrap gap-3 mb-3 small text-muted">
          {Object.entries(prioriteColors).map(([p, c]) => (
            <span key={p} className="d-inline-flex align-items-center gap-2">
              <span style={{ width: 10, height: 10, borderRadius: 3, background: c, display: 'inline-block' }} />
              {p.charAt(0) + p.slice(1).toLowerCase()}
            </span>
          ))}
        </div>

        {error && <Alert variant="danger">{error}</Alert>}

        {loading ? (
          <Spinner animation="border" />
        ) : (
          <>
            <div style={{ overflowX: 'auto' }}>
              <table className="table table-bordered" style={{ minWidth: view === 'week' ? 900 : 0 }}>
                <thead>
                  <tr>
                    <th style={{ width: 170 }}>Technicien</th>
                    {days.map((d) => (
                      <th
                        key={d.date}
                        className="text-center small"
                        style={d.date === todayKey ? { color: 'var(--accent)' } : undefined}
                      >
                        {d.label}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {rows.length === 0 && (
                    <tr>
                      <td colSpan={days.length + 1} className="text-center text-muted py-4">
                        Aucun technicien à afficher.
                      </td>
                    </tr>
                  )}

                  {rows.map((row) => (
                    <tr key={row.technicien.id}>
                      <td className="small">
                        <div className="fw-semibold">{row.technicien.matricule || '—'}</div>
                        <div className="text-muted">{techName(row.technicien)}</div>
                      </td>

                      {days.map((d) => {
                        const items = row.interventions.filter((i: any) => dayOf(i) === d.date);
                        return (
                          <td
                            key={d.date}
                            style={{
                              verticalAlign: 'top',
                              minWidth: view === 'week' ? 150 : 0,
                              background: d.date === todayKey ? 'rgba(245, 166, 35, 0.05)' : undefined,
                            }}
                          >
                            <div className={view === 'day' ? 'd-flex flex-wrap gap-2' : ''}>
                              {items.map((i: any) => {
                                const meta = statusMeta(i.statut);
                                const done = meta.label === 'Terminée';
                                const color = prioriteColors[i.priorite] || '#8B96A5';
                                return (
                                  <div
                                    key={i.id}
                                    className="mb-2"
                                    title={`Priorité : ${i.priorite ?? '—'}`}
                                    style={{
                                      background: 'var(--surface-2)',
                                      borderLeft: `4px solid ${color}`,
                                      borderRadius: 6,
                                      opacity: done ? 0.75 : 1,
                                      padding: '0.5rem 0.65rem',
                                      minWidth: view === 'day' ? 220 : undefined,
                                    }}
                                  >
                                    <div className="fw-semibold small">{i.type_panne}</div>
                                    <div className="text-muted" style={{ fontSize: '0.75rem' }}>
                                      {i.client_nom}
                                    </div>
                                    {i.statut && (
                                      <span
                                        className="statut-pill mt-1"
                                        style={{ color: meta.color, background: `${meta.color}22` }}
                                      >
                                        {meta.label}
                                      </span>
                                    )}
                                  </div>
                                );
                              })}
                            </div>
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {rows.length > 0 && totalVisible === 0 && (
              <p className="text-muted text-center mt-3 mb-0">
                Aucune intervention sur cette période{hasFilters ? ' avec ces filtres' : ''}.
              </p>
            )}
          </>
        )}
      </Container>
    </div>
  );
}