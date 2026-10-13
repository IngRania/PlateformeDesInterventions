import { FormEvent, useEffect, useState } from 'react';
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { Dropdown } from 'react-bootstrap';
import {
  BoxArrowRight, GearFill, Grid3x3GapFill, KeyFill, List, PersonCircle, Search, X,
} from 'react-bootstrap-icons';
import { useAuth } from '../context/AuthContext';
import { LocationProvider, useLocationSharing } from '../context/LocationContext';
import { getActiveSpace, setActiveSpace, spacesForRole, clearActiveSpace } from '../config/spaces';
import { initials, roleLabels } from '../utils/format';

/** Page de liste ciblée par la recherche rapide, selon l'espace actif. */
const searchTarget: Record<string, string> = {
  client: '/client/mes-interventions',
  technicien: '/technicien/mes-taches',
  responsable: '/responsable/interventions',
  admin: '/admin/utilisateurs',
};

function LocationIndicator() {
  const sharing = useLocationSharing();
  const navigate = useNavigate();
  if (!sharing) return null;
  const labels: Record<string, string> = {
    active: 'Position partagée',
    pending: 'Localisation…',
    off: 'Position non partagée',
    denied: 'Localisation refusée',
    unsupported: 'GPS non disponible',
    error: 'Erreur de localisation',
  };
  return (
    <button
      type="button"
      className={`gps-chip gps-${sharing.status}`}
      onClick={() => navigate('/technicien/position')}
      title="Gérer le partage de position"
    >
      <span className="gps-dot" />
      <span className="gps-label">{labels[sharing.status]}</span>
    </button>
  );
}

function Shell() {
  const { user, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [query, setQuery] = useState('');

  const space = getActiveSpace(user?.role, location.pathname);
  const spaces = spacesForRole(user?.role);

  useEffect(() => {
    if (space) setActiveSpace(space.key);
  }, [space]);

  useEffect(() => setMobileOpen(false), [location.pathname]);

  if (!user || !space) return null;

  const handleLogout = () => {
    logout();
    clearActiveSpace();
    navigate('/login');
  };

  const handleSearch = (e: FormEvent) => {
    e.preventDefault();
    const q = query.trim();
    navigate(`${searchTarget[space.key]}${q ? `?q=${encodeURIComponent(q)}` : ''}`);
  };

  const profilePath = space.nav.find((n) => n.path.endsWith('/profile'))?.path ?? '/';
  const SpaceIcon = space.icon;

  return (
    <div className={`app-shell ${mobileOpen ? 'nav-open' : ''}`} style={{ ['--space-color' as any]: space.color }}>
      <aside className="sidebar">
        <div className="sidebar-brand">
          <span className="brand-mark"><GearFill /></span>
          <div>
            <div className="brand-name">InTech</div>
            <div className="brand-sub">Interventions</div>
          </div>
          <button type="button" className="sidebar-close" onClick={() => setMobileOpen(false)} aria-label="Fermer le menu">
            <X />
          </button>
        </div>

        <div className="sidebar-space">
          <span className="sidebar-space-icon"><SpaceIcon /></span>
          <div className="sidebar-space-text">
            <div className="sidebar-space-label">Espace actif</div>
            <div className="sidebar-space-name">{space.label.replace('Espace ', '')}</div>
          </div>
        </div>

        <nav className="sidebar-nav">
          <div className="sidebar-section">Navigation</div>
          {space.nav.map((item) => {
            const ItemIcon = item.icon;
            return (
              <NavLink
                key={item.path}
                to={item.path}
                className={({ isActive }) => `sidebar-link ${isActive ? 'active' : ''}`}
              >
                <ItemIcon className="sidebar-link-icon" />
                <span>{item.label}</span>
              </NavLink>
            );
          })}
        </nav>

        <div className="sidebar-footer">
          {spaces.length > 1 && (
            <button type="button" className="sidebar-link w-100" onClick={() => navigate('/choisir-espace')}>
              <Grid3x3GapFill className="sidebar-link-icon" />
              <span>Changer d'espace</span>
            </button>
          )}
          <button type="button" className="sidebar-link w-100" onClick={handleLogout}>
            <BoxArrowRight className="sidebar-link-icon" />
            <span>Déconnexion</span>
          </button>
        </div>
      </aside>

      <div className="sidebar-backdrop" onClick={() => setMobileOpen(false)} />

      <div className="main">
        <header className="topbar">
          <button type="button" className="topbar-burger" onClick={() => setMobileOpen(true)} aria-label="Ouvrir le menu">
            <List />
          </button>

          <form className="topbar-search" onSubmit={handleSearch} role="search">
            <Search className="topbar-search-icon" />
            <input
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={space.key === 'admin' ? 'Rechercher un utilisateur…' : 'Rechercher une intervention…'}
              aria-label="Recherche"
            />
          </form>

          <div className="topbar-right">
            {user.role === 'TECHNICIEN' && <LocationIndicator />}

            <Dropdown align="end">
              <Dropdown.Toggle as="button" className="user-toggle" id="user-menu">
                {user.avatar_url ? (
                  <img src={user.avatar_url} alt="" className="user-avatar" />
                ) : (
                  <span className="user-avatar user-avatar-fallback">{initials(user.first_name, user.last_name)}</span>
                )}
                <span className="user-meta">
                  <span className="user-name">{user.first_name} {user.last_name}</span>
                  <span className="user-role">{roleLabels[user.role]}</span>
                </span>
              </Dropdown.Toggle>
              <Dropdown.Menu className="user-menu">
                <Dropdown.Header>{user.email}</Dropdown.Header>
                <Dropdown.Item onClick={() => navigate(profilePath)}>
                  <PersonCircle className="me-2" /> Mon profil
                </Dropdown.Item>
                <Dropdown.Item onClick={() => navigate('/change-password')}>
                  <KeyFill className="me-2" /> Changer le mot de passe
                </Dropdown.Item>
                {spaces.length > 1 && (
                  <Dropdown.Item onClick={() => navigate('/choisir-espace')}>
                    <Grid3x3GapFill className="me-2" /> Changer d'espace
                  </Dropdown.Item>
                )}
                <Dropdown.Divider />
                <Dropdown.Item onClick={handleLogout} className="text-danger">
                  <BoxArrowRight className="me-2" /> Déconnexion
                </Dropdown.Item>
              </Dropdown.Menu>
            </Dropdown>
          </div>
        </header>

        <main className="content">
          <Outlet />
        </main>
      </div>
    </div>
  );
}

export default function AppLayout() {
  const { user } = useAuth();
  // Le partage GPS ne concerne que les techniciens et vit aussi longtemps que le layout.
  if (user?.role === 'TECHNICIEN') {
    return (
      <LocationProvider>
        <Shell />
      </LocationProvider>
    );
  }
  return <Shell />;
}
