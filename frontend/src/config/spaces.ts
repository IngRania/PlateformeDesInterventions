import type { Icon } from 'react-bootstrap-icons';
import {
  BarChartLineFill, PeopleFill, PersonPlusFill, PersonCircle, ClipboardCheckFill, CalendarWeekFill,
  HddStackFill, GeoAltFill, ListTask, PlusCircleFill, ShieldLockFill, Wrench, PersonFill,
} from 'react-bootstrap-icons';

export type Role = 'ADMIN' | 'RESPONSABLE' | 'TECHNICIEN' | 'CLIENT';
export type SpaceKey = 'admin' | 'responsable' | 'technicien' | 'client';

export interface NavItem {
  label: string;
  path: string;
  icon: Icon;
}

export interface Space {
  key: SpaceKey;
  label: string;
  description: string;
  icon: Icon;
  color: string;
  home: string;
  /** Rôles autorisés à entrer dans cet espace. */
  roles: Role[];
  nav: NavItem[];
}

export const SPACES: Space[] = [
  {
    key: 'client',
    label: 'Espace Client',
    description: "Déposer vos demandes d'intervention, suivre leur avancement et télécharger les rapports.",
    icon: PersonFill,
    color: '#2563EB',
    home: '/client/dashboard',
    roles: ['CLIENT'],
    nav: [
      { label: 'Tableau de bord', path: '/client/dashboard', icon: BarChartLineFill },
      { label: 'Nouvelle demande', path: '/client/nouvelle-demande', icon: PlusCircleFill },
      { label: 'Mes interventions', path: '/client/mes-interventions', icon: ListTask },
      { label: 'Mon profil', path: '/client/profile', icon: PersonCircle },
    ],
  },
  {
    key: 'technicien',
    label: 'Espace Technicien',
    description: 'Consulter vos tâches, partager votre position et clôturer vos interventions.',
    icon: Wrench,
    color: '#16A34A',
    home: '/technicien/dashboard',
    roles: ['TECHNICIEN'],
    nav: [
      { label: 'Tableau de bord', path: '/technicien/dashboard', icon: BarChartLineFill },
      { label: 'Mes tâches', path: '/technicien/mes-taches', icon: ListTask },
      { label: 'Ma position', path: '/technicien/position', icon: GeoAltFill },
      { label: 'Mon profil', path: '/technicien/profile', icon: PersonCircle },
    ],
  },
  {
    key: 'responsable',
    label: 'Espace Responsable maintenance',
    description: 'Affecter les techniciens, piloter le calendrier, les équipements et le suivi terrain.',
    icon: ClipboardCheckFill,
    color: '#D97706',
    home: '/responsable/dashboard',
    roles: ['RESPONSABLE', 'ADMIN'],
    nav: [
      { label: 'Tableau de bord', path: '/responsable/dashboard', icon: BarChartLineFill },
      { label: 'Demandes', path: '/responsable/interventions', icon: ListTask },
      { label: 'Calendrier', path: '/responsable/calendrier', icon: CalendarWeekFill },
      { label: 'Équipements', path: '/responsable/equipements', icon: HddStackFill },
      { label: 'Localisation', path: '/responsable/tracking', icon: GeoAltFill },
      { label: 'Mon profil', path: '/responsable/profile', icon: PersonCircle },
    ],
  },
  {
    key: 'admin',
    label: 'Espace Administrateur',
    description: 'Gérer les comptes utilisateurs et superviser toute la plateforme.',
    icon: ShieldLockFill,
    color: '#DC2626',
    home: '/admin/dashboard',
    roles: ['ADMIN'],
    nav: [
      { label: 'Tableau de bord', path: '/admin/dashboard', icon: BarChartLineFill },
      { label: 'Utilisateurs', path: '/admin/utilisateurs', icon: PeopleFill },
      { label: 'Créer un compte', path: '/admin/create-staff', icon: PersonPlusFill },
      { label: 'Mon profil', path: '/admin/profile', icon: PersonCircle },
    ],
  },
];

export const spacesForRole = (role?: string) =>
  SPACES.filter((s) => !!role && s.roles.includes(role as Role));

const ACTIVE_SPACE_KEY = 'active_space';

export function getActiveSpace(role?: string, pathname?: string): Space | undefined {
  const allowed = spacesForRole(role);
  // L'URL courante fait foi (ex : un admin qui ouvre une page responsable).
  const fromPath = allowed.find((s) => pathname?.startsWith(`/${s.key}/`));
  if (fromPath) return fromPath;
  let saved: string | null = null;
  try { saved = localStorage.getItem(ACTIVE_SPACE_KEY); } catch { /* stockage indisponible */ }
  return allowed.find((s) => s.key === saved) ?? allowed[0];
}

export function setActiveSpace(key: SpaceKey) {
  try { localStorage.setItem(ACTIVE_SPACE_KEY, key); } catch { /* stockage indisponible */ }
}

export function clearActiveSpace() {
  try { localStorage.removeItem(ACTIVE_SPACE_KEY); } catch { /* stockage indisponible */ }
}
