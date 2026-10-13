import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { BoxArrowRight, ChevronRight, GearFill, LockFill } from 'react-bootstrap-icons';
import { useAuth } from '../context/AuthContext';
import { SPACES, setActiveSpace, clearActiveSpace, Space } from '../config/spaces';
import { initials, roleLabels } from '../utils/format';

/**
 * Sélection du rôle / de l'espace, affichée juste après la connexion.
 * Les espaces non autorisés pour le rôle de l'utilisateur sont visibles mais verrouillés.
 */
export default function SpaceSelectPage() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!user) navigate('/login', { replace: true });
    else if (user.must_change_password) navigate('/change-password', { replace: true });
  }, [user, navigate]);

  if (!user) return null;

  const enter = (space: Space) => {
    setActiveSpace(space.key);
    navigate(space.home);
  };

  const handleLogout = () => {
    logout();
    clearActiveSpace();
    navigate('/login');
  };

  return (
    <div className="role-page">
      <header className="role-hero">
        <div className="role-hero-inner">
          <div className="role-topline">
            <div className="role-brand">
              <span className="brand-mark"><GearFill size={16} /></span>
              InTech Interventions
            </div>
            <button type="button" className="role-logout" onClick={handleLogout}>
              <BoxArrowRight /> Déconnexion
            </button>
          </div>

          <div className="role-hero-text">
            <div className="role-user">
              {user.avatar_url ? (
                <img src={user.avatar_url} alt="" className="role-user-avatar" />
              ) : (
                <span className="role-user-avatar">{initials(user.first_name, user.last_name)}</span>
              )}
              <div>
                <div className="role-user-name">Bonjour {user.first_name || user.email} 👋</div>
                <div className="role-user-role">Connecté en tant que {roleLabels[user.role]}</div>
              </div>
            </div>
            <h1 className="role-title">Sélectionnez votre espace</h1>
            <p className="role-subtitle">
              Choisissez le rôle avec lequel vous souhaitez travailler. Seuls les espaces
              correspondant à vos droits sont accessibles.
            </p>
          </div>
        </div>
      </header>

      <main className="role-main">
        <div className="role-grid">
          {SPACES.map((space) => {
            const allowed = space.roles.includes(user.role);
            const SpaceIcon = space.icon;
            return (
              <button
                key={space.key}
                type="button"
                className={`role-card ${allowed ? '' : 'role-card-locked'}`}
                disabled={!allowed}
                onClick={() => enter(space)}
                style={{ ['--role-color' as any]: space.color }}
              >
                <span className="role-icon"><SpaceIcon /></span>
                <span className="role-name">{space.label.replace('Espace ', '')}</span>
                <span className="role-desc">{space.description}</span>
                <span className="role-foot">
                  {allowed ? (
                    <>
                      <span className="role-hint">Accès autorisé</span>
                      <span className="role-cta">Entrer <ChevronRight size={12} /></span>
                    </>
                  ) : (
                    <span className="role-hint"><LockFill size={11} /> Non autorisé pour votre rôle</span>
                  )}
                </span>
              </button>
            );
          })}
        </div>
      </main>
    </div>
  );
}
