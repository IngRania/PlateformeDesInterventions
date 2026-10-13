import { useNavigate } from 'react-router-dom';
import {
  Bar, BarChart, CartesianGrid, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis,
} from 'recharts';
import { ChevronRight } from 'react-bootstrap-icons';
import { DashboardData, Intervention } from '../api/interventions';
import { EmptyState, Panel, StatutBadge } from './ui';
import { formatDate, prioriteMeta, PRIORITES, statutMeta, STATUTS, timeAgo } from '../utils/format';

const MONTHS = ['janv.', 'févr.', 'mars', 'avr.', 'mai', 'juin', 'juil.', 'août', 'sept.', 'oct.', 'nov.', 'déc.'];
const SERIES = { creees: '#2563EB', terminees: '#16A34A' };

function monthLabel(key: string) {
  const [y, m] = key.split('-');
  return `${MONTHS[parseInt(m, 10) - 1]} ${y.slice(2)}`;
}

/** Barres horizontales libellées : le libellé et la valeur portent l'information, la couleur l'accompagne. */
export function BarList({ rows, total }: {
  rows: { key: string; label: string; value: number; color: string; onClick?: () => void }[];
  total: number;
}) {
  return (
    <ul className="bar-list">
      {rows.map((r) => {
        const pct = total ? Math.round((100 * r.value) / total) : 0;
        return (
          <li
            key={r.key}
            className={r.onClick ? 'clickable' : ''}
            onClick={r.onClick}
            title={`${r.label} : ${r.value} (${pct} %)`}
          >
            <div className="bar-list-head">
              <span className="bar-list-label">
                <span className="legend-dot" style={{ background: r.color }} /> {r.label}
              </span>
              <span className="bar-list-value">{r.value} <span className="text-muted">· {pct} %</span></span>
            </div>
            <div className="bar-track">
              <div className="bar-fill" style={{ width: `${pct}%`, background: r.color }} />
            </div>
          </li>
        );
      })}
    </ul>
  );
}

export function StatusPanel({ data, listPath }: { data: DashboardData; listPath?: string }) {
  const navigate = useNavigate();
  return (
    <Panel title="Répartition par statut" className="h-100">
      <BarList
        total={data.total}
        rows={STATUTS.map((s) => ({
          key: s,
          label: statutMeta[s].label,
          value: data.par_statut[s] ?? 0,
          color: statutMeta[s].color,
          onClick: listPath ? () => navigate(`${listPath}?statut=${s}`) : undefined,
        }))}
      />
    </Panel>
  );
}

export function PriorityPanel({ data }: { data: DashboardData }) {
  return (
    <Panel title="Répartition par priorité" className="h-100">
      <BarList
        total={data.total}
        rows={[...PRIORITES].reverse().map((p) => ({
          key: p,
          label: prioriteMeta[p].label,
          value: data.par_priorite[p] ?? 0,
          color: prioriteMeta[p].color,
        }))}
      />
    </Panel>
  );
}

function MonthTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  return (
    <div className="chart-tooltip">
      <div className="chart-tooltip-title">{monthLabel(label)}</div>
      {payload.map((p: any) => (
        <div key={p.dataKey} className="chart-tooltip-row">
          <span className="legend-dot" style={{ background: p.color }} />
          <span>{p.name}</span>
          <strong>{p.value}</strong>
        </div>
      ))}
    </div>
  );
}

export function MonthlyPanel({ data }: { data: DashboardData }) {
  return (
    <Panel title="Activité des 6 derniers mois" className="h-100">
      <ResponsiveContainer width="100%" height={260}>
        <BarChart data={data.par_mois} barGap={2} barCategoryGap="28%">
          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
          <XAxis dataKey="mois" tickFormatter={monthLabel} fontSize={12} stroke="#94A3B8" tickLine={false} axisLine={false} />
          <YAxis allowDecimals={false} fontSize={12} stroke="#94A3B8" tickLine={false} axisLine={false} width={32} />
          <Tooltip content={<MonthTooltip />} cursor={{ fill: 'rgba(37, 99, 235, 0.06)' }} />
          <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 12 }}
            formatter={(value) => <span style={{ color: '#475569' }}>{value}</span>} />
          <Bar dataKey="creees" name="Créées" fill={SERIES.creees} radius={[4, 4, 0, 0]} maxBarSize={22} />
          <Bar dataKey="terminees" name="Terminées" fill={SERIES.terminees} radius={[4, 4, 0, 0]} maxBarSize={22} />
        </BarChart>
      </ResponsiveContainer>
    </Panel>
  );
}

export function RecentPanel({ items, detailBase, listPath, title = 'Dernières interventions' }: {
  items: Intervention[]; detailBase: string; listPath: string; title?: string;
}) {
  const navigate = useNavigate();
  return (
    <Panel
      title={title}
      className="h-100"
      flush
      actions={
        <button type="button" className="link-btn" onClick={() => navigate(listPath)}>
          Tout voir <ChevronRight />
        </button>
      }
    >
      {items.length === 0 ? (
        <EmptyState title="Aucune intervention" />
      ) : (
        <ul className="recent-list">
          {items.map((i) => (
            <li key={i.id} onClick={() => navigate(`${detailBase}/${i.id}`)}>
              <div className="recent-main">
                <div className="fw-semibold">
                  <span className="mono text-muted me-2">#{i.id}</span>{i.type_panne}
                </div>
                <div className="cell-sub">
                  {i.client_nom} · {i.technicien_nom ? `Tech. ${i.technicien_nom}` : 'Non affectée'} · {timeAgo(i.created_at)}
                </div>
              </div>
              <div className="recent-side">
                <StatutBadge statut={i.statut} />
                <span className="cell-sub">{formatDate(i.date_souhaitee)}</span>
              </div>
            </li>
          ))}
        </ul>
      )}
    </Panel>
  );
}

export function TechniciansPanel({ data }: { data: DashboardData }) {
  const rows = data.par_technicien ?? [];
  const max = Math.max(1, ...rows.map((r) => r.total));
  return (
    <Panel title="Charge par technicien" className="h-100">
      {rows.length === 0 ? (
        <EmptyState title="Aucune intervention affectée" />
      ) : (
        <>
          <div className="legend-inline mb-2">
            <span><span className="legend-dot" style={{ background: SERIES.terminees }} /> Terminées</span>
            <span><span className="legend-dot" style={{ background: '#D97706' }} /> En cours / affectées</span>
          </div>
          <ul className="tech-load">
            {rows.map((r) => (
              <li key={r.id} title={`${r.nom} : ${r.terminees} terminée(s), ${r.en_cours} en cours`}>
                <div className="tech-load-name">
                  <span className="fw-semibold">{r.nom || '—'}</span>
                  <span className="mono text-muted small">{r.matricule}</span>
                </div>
                <div className="tech-load-bar">
                  <div className="seg" style={{ width: `${(100 * r.terminees) / max}%`, background: SERIES.terminees }} />
                  <div className="seg" style={{ width: `${(100 * r.en_cours) / max}%`, background: '#D97706' }} />
                </div>
                <span className="tech-load-total">{r.total}</span>
              </li>
            ))}
          </ul>
        </>
      )}
    </Panel>
  );
}
