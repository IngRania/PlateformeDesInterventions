import { ReactNode } from 'react';
import { Spinner } from 'react-bootstrap';
import type { Icon } from 'react-bootstrap-icons';
import { Inbox } from 'react-bootstrap-icons';
import { prioriteMeta, statutMeta, Priorite, Statut } from '../utils/format';

export function StatutBadge({ statut }: { statut: string }) {
  const meta = statutMeta[statut as Statut] ?? { label: statut, color: '#64748B' };
  return (
    <span className="pill" style={{ ['--pill-color' as any]: meta.color }}>
      <span className="pill-dot" />
      {meta.label}
    </span>
  );
}

export function PrioriteBadge({ priorite }: { priorite: string }) {
  const meta = prioriteMeta[priorite as Priorite] ?? { label: priorite, color: '#64748B' };
  return (
    <span className="pill pill-outline" style={{ ['--pill-color' as any]: meta.color }}>
      {meta.label}
    </span>
  );
}

interface KpiProps {
  label: string;
  value: ReactNode;
  icon?: Icon;
  color?: string;
  hint?: ReactNode;
  onClick?: () => void;
}

export function KpiCard({ label, value, icon: KpiIcon, color = '#2563EB', hint, onClick }: KpiProps) {
  return (
    <div
      className={`kpi ${onClick ? 'kpi-clickable' : ''}`}
      style={{ ['--kpi-color' as any]: color }}
      onClick={onClick}
      role={onClick ? 'button' : undefined}
      tabIndex={onClick ? 0 : undefined}
      onKeyDown={(e) => { if (onClick && (e.key === 'Enter' || e.key === ' ')) onClick(); }}
    >
      <div className="kpi-top">
        <span className="kpi-title">{label}</span>
        {KpiIcon && (
          <span className="kpi-icon"><KpiIcon /></span>
        )}
      </div>
      <div className="kpi-number">{value}</div>
      {hint && <div className="kpi-hint">{hint}</div>}
    </div>
  );
}

interface PageHeaderProps {
  eyebrow?: string;
  title: string;
  subtitle?: ReactNode;
  actions?: ReactNode;
}

export function PageHeader({ eyebrow, title, subtitle, actions }: PageHeaderProps) {
  return (
    <div className="page-head">
      <div>
        {eyebrow && <div className="page-eyebrow">{eyebrow}</div>}
        <h1 className="page-title">{title}</h1>
        {subtitle && <p className="page-subtitle">{subtitle}</p>}
      </div>
      {actions && <div className="page-actions">{actions}</div>}
    </div>
  );
}

export function EmptyState({ title, text, action, icon: EmptyIcon = Inbox }: {
  title: string; text?: string; action?: ReactNode; icon?: Icon;
}) {
  return (
    <div className="empty-state">
      <span className="empty-icon"><EmptyIcon /></span>
      <div className="empty-title">{title}</div>
      {text && <p className="empty-text">{text}</p>}
      {action}
    </div>
  );
}

export function Loading({ label = 'Chargement…' }: { label?: string }) {
  return (
    <div className="loading-block">
      <Spinner animation="border" size="sm" /> <span>{label}</span>
    </div>
  );
}

export function Panel({ title, actions, children, className = '', flush = false }: {
  title?: ReactNode; actions?: ReactNode; children: ReactNode; className?: string; flush?: boolean;
}) {
  return (
    <section className={`panel ${className}`}>
      {(title || actions) && (
        <header className="panel-head">
          {title && <h2 className="panel-title">{title}</h2>}
          {actions && <div className="panel-actions">{actions}</div>}
        </header>
      )}
      <div className={flush ? '' : 'panel-body'}>{children}</div>
    </section>
  );
}
