import { useEffect, useMemo, useState } from 'react';
import { Alert, Button, ButtonGroup, Col, Form, Row } from 'react-bootstrap';
import { useNavigate } from 'react-router-dom';
import { ChevronLeft, ChevronRight, Funnel, Search, XCircle } from 'react-bootstrap-icons';
import { CalendarIntervention, CalendarRow, getCalendar } from '../../api/interventions';
import { EmptyState, Loading, PageHeader, StatutBadge } from '../../components/ui';
import {
  matchesSearch, prioriteMeta, PRIORITES, Priorite, statutMeta, Statut,
} from '../../utils/format';

type View = 'week' | 'day' | 'agenda';
interface DayCol { date: string; label: string; short: string; }

/* ---------- Dates (toujours en heure LOCALE, jamais via toISOString qui passe en UTC) ---------- */
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
  const count = view === 'day' ? 1 : 7;
  const first = view === 'day' ? new Date(anchor) : startOfWeek(anchor);
  const days: DayCol[] = [];
  for (let i = 0; i < count; i++) {
    const d = new Date(first);
    d.setDate(first.getDate() + i);
    days.push({
      date: toKey(d),
      label: d.toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' }),
      short: d.toLocaleDateString('fr-FR', { weekday: 'short', day: 'numeric', month: 'short' }),
    });
  }
  return days;
}

const CALENDAR_STATUTS: Statut[] = ['AFFECTEE', 'EN_COURS', 'TERMINEE'];

function techName(t: CalendarRow['technicien']): string {
  return `${t.first_name ?? ''} ${t.last_name ?? ''}`.trim();
}

export default function CalendarPage() {
  const navigate = useNavigate();
  const [view, setView] = useState<View>('week');
  const [anchor, setAnchor] = useState<Date>(new Date());
  const [data, setData] = useState<CalendarRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [search, setSearch] = useState('');
  const [techFilter, setTechFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [prioFilter, setPrioFilter] = useState('');
  const [clientFilter, setClientFilter] = useState('');
  const [hideIdle, setHideIdle] = useState(false);

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
        .catch(() => { if (!cancelled) setError('Impossible de charger le planning.'); })
        .finally(() => { if (!cancelled && initial) setLoading(false); });
    };
    load(true);
    const interval = setInterval(() => load(false), 15000);
    return () => { cancelled = true; clearInterval(interval); };
  }, [start, end]);

  const shift = (delta: number) => {
    const d = new Date(anchor);
    d.setDate(d.getDate() + delta * (view === 'day' ? 1 : 7));
    setAnchor(d);
  };

  /* Options de filtres, déduites des données reçues */
  const clients = useMemo(() => {
    const set = new Set<string>();
    data.forEach((r) => r.interventions.forEach((i) => i.client_nom && set.add(i.client_nom)));
    return Array.from(set).sort((a, b) => a.localeCompare(b, 'fr'));
  }, [data]);

  /* Application de la recherche et des filtres */
  const matches = (i: CalendarIntervention, row: CalendarRow) =>
    (!statusFilter || i.statut === statusFilter) &&
    (!prioFilter || i.priorite === prioFilter) &&
    (!clientFilter || i.client_nom === clientFilter) &&
    matchesSearch(
      search, `#${i.id}`, i.id, i.type_panne, i.description, i.client_nom, i.client_email,
      row.technicien.matricule, techName(row.technicien), statutMeta[i.statut]?.label,
    );

  const rows = useMemo(
    () => data
      .filter((r) => !techFilter || String(r.technicien.id) === techFilter)
      .map((r) => ({ ...r, interventions: r.interventions.filter((i) => matches(i, r)) }))
      .filter((r) => !hideIdle || r.interventions.length > 0),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [data, techFilter, statusFilter, prioFilter, clientFilter, search, hideIdle]
  );

  const visible = rows.flatMap((r) => r.interventions.map((i) => ({ ...i, row: r })));
  const doneVisible = visible.filter((i) => i.statut === 'TERMINEE').length;

  const activeFilters = [search, techFilter, statusFilter, prioFilter, clientFilter].filter(Boolean).length + (hideIdle ? 1 : 0);
  const resetFilters = () => {
    setSearch(''); setTechFilter(''); setStatusFilter(''); setPrioFilter(''); setClientFilter(''); setHideIdle(false);
  };

  const periodLabel = view === 'day'
    ? days[0].label
    : `${new Date(start + 'T00:00:00').toLocaleDateString('fr-FR', { day: 'numeric', month: 'long' })} – ${new Date(end + 'T00:00:00').toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })}`;

  const card = (i: CalendarIntervention, row: CalendarRow, showTech = false) => {
    const color = prioriteMeta[i.priorite as Priorite]?.color ?? '#64748B';
    return (
      <button
        type="button"
        key={i.id}
        className={`cal-event ${i.statut === 'TERMINEE' ? 'done' : ''}`}
        style={{ ['--event-color' as any]: color }}
        onClick={() => navigate(`/responsable/interventions/${i.id}`)}
        title={`#${i.id} · ${i.type_panne} — priorité ${prioriteMeta[i.priorite as Priorite]?.label}. Cliquer pour voir les détails.`}
      >
        <span className="cal-event-title"><span className="mono">#{i.id}</span> {i.type_panne}</span>
        <span className="cal-event-sub">{i.client_nom}{showTech && ` · ${techName(row.technicien)}`}</span>
        <StatutBadge statut={i.statut} />
      </button>
    );
  };

  return (
    <>
      <PageHeader
        eyebrow="Responsable maintenance"
        title="Calendrier des interventions"
        subtitle={periodLabel}
        actions={
          <>
            <ButtonGroup>
              {(['week', 'day', 'agenda'] as View[]).map((v) => (
                <Button key={v} variant={view === v ? 'primary' : 'outline-secondary'} onClick={() => setView(v)}>
                  {v === 'week' ? 'Semaine' : v === 'day' ? 'Jour' : 'Liste'}
                </Button>
              ))}
            </ButtonGroup>
            <ButtonGroup>
              <Button variant="outline-secondary" onClick={() => shift(-1)} aria-label="Période précédente"><ChevronLeft /></Button>
              <Button variant="outline-secondary" onClick={() => setAnchor(new Date())}>Aujourd'hui</Button>
              <Button variant="outline-secondary" onClick={() => shift(1)} aria-label="Période suivante"><ChevronRight /></Button>
            </ButtonGroup>
            <Form.Control
              type="date"
              className="date-jump"
              value={toKey(anchor)}
              onChange={(e) => e.target.value && setAnchor(new Date(`${e.target.value}T00:00:00`))}
              aria-label="Aller à la date"
            />
          </>
        }
      />

      {/* ----- Recherche & filtres ----- */}
      <div className="panel mb-3">
        <div className="panel-body">
          <Row className="g-3 align-items-end">
            <Col xs={12} lg={4}>
              <Form.Label>Recherche</Form.Label>
              <div className="search-input">
                <Search />
                <Form.Control
                  type="search"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="N°, type de panne, client, technicien…"
                />
              </div>
            </Col>
            <Col xs={6} md={4} lg={2}>
              <Form.Label>Technicien</Form.Label>
              <Form.Select value={techFilter} onChange={(e) => setTechFilter(e.target.value)}>
                <option value="">Tous</option>
                {data.map(({ technicien: t }) => (
                  <option key={t.id} value={String(t.id)}>{[t.matricule, techName(t)].filter(Boolean).join(' · ')}</option>
                ))}
              </Form.Select>
            </Col>
            <Col xs={6} md={4} lg={2}>
              <Form.Label>Statut</Form.Label>
              <Form.Select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
                <option value="">Tous</option>
                {CALENDAR_STATUTS.map((s) => <option key={s} value={s}>{statutMeta[s].label}</option>)}
              </Form.Select>
            </Col>
            <Col xs={6} md={4} lg={2}>
              <Form.Label>Priorité</Form.Label>
              <Form.Select value={prioFilter} onChange={(e) => setPrioFilter(e.target.value)}>
                <option value="">Toutes</option>
                {PRIORITES.map((p) => <option key={p} value={p}>{prioriteMeta[p].label}</option>)}
              </Form.Select>
            </Col>
            <Col xs={6} md={4} lg={2}>
              <Form.Label>Client</Form.Label>
              <Form.Select value={clientFilter} onChange={(e) => setClientFilter(e.target.value)}>
                <option value="">Tous</option>
                {clients.map((c) => <option key={c} value={c}>{c}</option>)}
              </Form.Select>
            </Col>
          </Row>
          <div className="filter-foot">
            <Form.Check
              type="switch"
              id="hide-idle"
              label="Masquer les techniciens sans intervention"
              checked={hideIdle}
              onChange={(e) => setHideIdle(e.target.checked)}
            />
            <div className="legend-inline">
              {PRIORITES.map((p) => (
                <span key={p}><span className="legend-dot" style={{ background: prioriteMeta[p].color }} /> {prioriteMeta[p].label}</span>
              ))}
            </div>
            <span className="toolbar-count">
              <Funnel className="me-1" />
              {visible.length - doneVisible} à faire · {doneVisible} terminée{doneVisible > 1 ? 's' : ''}
            </span>
            {activeFilters > 0 && (
              <Button variant="link" size="sm" className="toolbar-reset" onClick={resetFilters}>
                <XCircle className="me-1" /> Réinitialiser ({activeFilters})
              </Button>
            )}
          </div>
        </div>
      </div>

      {error && <Alert variant="danger">{error}</Alert>}

      {loading ? <Loading /> : view === 'agenda' ? (
        <div className="panel">
          {days.every((d) => !visible.some((i) => i.date_calendrier === d.date)) ? (
            <EmptyState title="Aucune intervention cette semaine" text={activeFilters ? 'Essayez de modifier les filtres.' : undefined} />
          ) : days.map((d) => {
            const dayItems = visible.filter((i) => i.date_calendrier === d.date);
            if (!dayItems.length) return null;
            return (
              <div key={d.date} className={`agenda-day ${d.date === todayKey ? 'today' : ''}`}>
                <div className="agenda-date">{d.label}</div>
                <div className="agenda-items">{dayItems.map((i) => card(i, i.row, true))}</div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="panel cal-wrap">
          <table className={`cal-table ${view}`}>
            <thead>
              <tr>
                <th className="cal-tech-col">Technicien</th>
                {days.map((d) => (
                  <th key={d.date} className={d.date === todayKey ? 'today' : ''}>
                    {view === 'day' ? d.label : d.short}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.length === 0 && (
                <tr>
                  <td colSpan={days.length + 1}>
                    <EmptyState title="Aucun technicien à afficher" text={activeFilters ? 'Essayez de modifier les filtres.' : undefined} />
                  </td>
                </tr>
              )}
              {rows.map((row) => (
                <tr key={row.technicien.id}>
                  <td className="cal-tech-col">
                    <div className="fw-semibold">{techName(row.technicien) || '—'}</div>
                    <div className="cell-sub mono">{row.technicien.matricule}</div>
                    <div className="cell-sub">{row.interventions.length} intervention{row.interventions.length > 1 ? 's' : ''}</div>
                  </td>
                  {days.map((d) => (
                    <td key={d.date} className={d.date === todayKey ? 'today' : ''}>
                      <div className="cal-cell">
                        {row.interventions.filter((i) => i.date_calendrier === d.date).map((i) => card(i, row))}
                      </div>
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}
