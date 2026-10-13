import { ReactNode } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Form, Dropdown } from 'react-bootstrap';
import { useAuth } from '../context/AuthContext';

interface Props {
  children: ReactNode;
}

const navItems = [
  { label: 'Dashboard', path: '/admin/dashboard', icon: '📊' },
  { label: 'Créer Technicien/Responsable', path: '/admin/create-staff', icon: '➕' },
  { label: 'Mon profil', path: '/admin/profile', icon: '👤' },
];

export default function AdminLayout({ children }: Props) {
  const { user, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const initials = `${user?.first_name?.[0] || ''}${user?.last_name?.[0] || ''}`.toUpperCase();

  return (
    <div className="admin-layout">
      <aside className="admin-sidebar">
        <div className="admin-sidebar-brand">
          <span className="brand-icon">⚙️</span> InTech Interventions
        </div>
        <nav className="admin-nav">
          {navItems.map((item) => (
            <Link
              key={item.path}
              to={item.path}
              className={`admin-nav-link ${location.pathname === item.path ? 'active' : ''}`}
            >
              <span className="admin-nav-icon">{item.icon}</span>
              {item.label}
            </Link>
          ))}
        </nav>
      </aside>

      <div className="admin-main">
        <header className="admin-topbar">
          <Form className="admin-search">
            <Form.Control type="text" placeholder="Rechercher..." size="sm" />
          </Form>

          <Dropdown align="end">
            <Dropdown.Toggle as="div" className="admin-user-toggle" id="admin-user-dropdown">
              {user?.avatar_url ? (
                <img src={user.avatar_url} alt="avatar" className="admin-avatar-img" />
              ) : (
                <div className="admin-avatar-fallback">{initials || '?'}</div>
              )}
            </Dropdown.Toggle>
            <Dropdown.Menu>
              <Dropdown.Item onClick={() => navigate('/admin/profile')}>Mon profil</Dropdown.Item>
              <Dropdown.Item onClick={() => navigate('/change-password')}>Changer le mot de passe</Dropdown.Item>
              <Dropdown.Divider />
              <Dropdown.Item onClick={handleLogout}>Déconnexion</Dropdown.Item>
            </Dropdown.Menu>
          </Dropdown>
        </header>

        <main className="admin-content">{children}</main>
      </div>
    </div>
  );
}