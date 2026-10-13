// Libellés, couleurs et formats partagés par toutes les interfaces.

export type Statut = 'EN_ATTENTE' | 'AFFECTEE' | 'EN_COURS' | 'TERMINEE';
export type Priorite = 'BASSE' | 'NORMALE' | 'HAUTE' | 'URGENTE';

export const STATUTS: Statut[] = ['EN_ATTENTE', 'AFFECTEE', 'EN_COURS', 'TERMINEE'];
export const PRIORITES: Priorite[] = ['BASSE', 'NORMALE', 'HAUTE', 'URGENTE'];

export const statutMeta: Record<Statut, { label: string; color: string }> = {
  EN_ATTENTE: { label: 'En attente', color: '#64748B' },
  AFFECTEE: { label: 'Affectée', color: '#2563EB' },
  EN_COURS: { label: 'En cours', color: '#D97706' },
  TERMINEE: { label: 'Terminée', color: '#16A34A' },
};

export const prioriteMeta: Record<Priorite, { label: string; color: string }> = {
  BASSE: { label: 'Basse', color: '#64748B' },
  NORMALE: { label: 'Normale', color: '#0EA5E9' },
  HAUTE: { label: 'Haute', color: '#F59E0B' },
  URGENTE: { label: 'Urgente', color: '#DC2626' },
};

export const roleLabels: Record<string, string> = {
  ADMIN: 'Administrateur',
  RESPONSABLE: 'Responsable maintenance',
  TECHNICIEN: 'Technicien',
  CLIENT: 'Client',
};

/** Date locale au format AAAA-MM-JJ (sans passer par l'UTC). */
export function toDateKey(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

/** Première date acceptée pour une date souhaitée : demain (strictement après aujourd'hui). */
export function minDesiredDate(): string {
  const d = new Date();
  d.setDate(d.getDate() + 1);
  return toDateKey(d);
}

export function formatDate(value?: string | null): string {
  if (!value) return '—';
  // Une date seule ("2026-10-13") est interprétée en heure locale, pas en UTC.
  const d = value.length === 10 ? new Date(`${value}T00:00:00`) : new Date(value);
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' });
}

export function formatDateTime(value?: string | null): string {
  if (!value) return '—';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleString('fr-FR', {
    day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit',
  });
}

export function timeAgo(value?: string | null): string {
  if (!value) return '—';
  const diff = (Date.now() - new Date(value).getTime()) / 1000;
  if (diff < 60) return "à l'instant";
  if (diff < 3600) return `il y a ${Math.floor(diff / 60)} min`;
  if (diff < 86400) return `il y a ${Math.floor(diff / 3600)} h`;
  return `il y a ${Math.floor(diff / 86400)} j`;
}

export function initials(first?: string, last?: string): string {
  return `${first?.[0] || ''}${last?.[0] || ''}`.toUpperCase() || '?';
}

/** Recherche plein texte insensible à la casse et aux accents. */
export function normalize(text: unknown): string {
  return String(text ?? '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '');
}

export function matchesSearch(query: string, ...fields: unknown[]): boolean {
  const q = normalize(query).trim();
  if (!q) return true;
  const haystack = fields.map(normalize).join(' ');
  return q.split(/\s+/).every((word) => haystack.includes(word));
}

/** Premier message d'erreur renvoyé par DRF, ou le message par défaut. */
export function apiError(err: any, fallback: string): string {
  const data = err?.response?.data;
  if (!data) return fallback;
  if (typeof data.detail === 'string') return data.detail;
  const first = Object.values(data)[0];
  if (Array.isArray(first) && typeof first[0] === 'string') return first[0];
  if (typeof first === 'string') return first;
  return fallback;
}
