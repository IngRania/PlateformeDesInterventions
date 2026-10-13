import { useNavigate, Link } from 'react-router-dom';
import {
  PersonFill,
  ClipboardCheckFill,
  Wrench,
  ShieldLockFill,
  ChevronRight,
  GearFill,
} from 'react-bootstrap-icons';
import type { Icon } from 'react-bootstrap-icons';

interface RoleCard {
  key: string;
  label: string;
  desc: string;
  loginHint: string;
  path: string;
  icon: Icon;
  color: string; // texte / icône (assez foncé pour être lisible sur blanc)
  tint: string; // fond de la pastille d'icône
}

const roles: RoleCard[] = [
  {
    key: 'client',
    label: 'Client',
    desc: "Déposer et suivre vos demandes d'intervention.",
    loginHint: 'Connexion par email',
    path: '/login',
    icon: PersonFill,
    color: '#2563EB',
    tint: 'rgba(37, 99, 235, 0.10)',
  },
  {
    key: 'responsable',
    label: 'Responsable',
    desc: 'Affecter les techniciens et piloter le planning.',
    loginHint: 'Connexion par matricule',
    path: '/staff-login',
    icon: ClipboardCheckFill,
    color: '#B45309',
    tint: 'rgba(245, 166, 35, 0.16)',
  },
  {
    key: 'technicien',
    label: 'Technicien',
    desc: 'Consulter vos interventions et mettre à jour leur statut.',
    loginHint: 'Connexion par matricule',
    path: '/staff-login',
    icon: Wrench,
    color: '#15803D',
    tint: 'rgba(34, 197, 94, 0.13)',
  },
  {
    key: 'admin',
    label: 'Administrateur',
    desc: 'Gérer les comptes et superviser la plateforme.',
    loginHint: 'Connexion par email',
    path: '/login',
    icon: ShieldLockFill,
    color: '#BE123C',
    tint: 'rgba(225, 29, 72, 0.10)',
  },
];

export default function RoleSelectPage() {
  const navigate = useNavigate();

  return (
    <div className="role-page">
      <header className="role-hero">
        <div className="role-hero-inner">
          <div className="role-brand">
            <span className="role-brand-mark">
              <GearFill size={16} />
            </span>
            InTech Interventions
          </div>

          <div className="role-hero-text">
            <h1 className="role-title">Accédez à votre espace</h1>
            <p className="role-subtitle">
              Sélectionnez votre profil pour vous connecter. Chaque rôle dispose
              d'une interface adaptée à ses droits.
            </p>
          </div>
        </div>
      </header>

      <main className="role-main">
        <div className="role-grid">
          {roles.map((r) => {
            const RoleIcon = r.icon;
            return (
              <button
                key={r.key}
                type="button"
                className="role-card"
                onClick={() => navigate(r.path)}
                style={
                  {
                    '--role-color': r.color,
                    '--role-tint': r.tint,
                  } as React.CSSProperties
                }
              >
                <span className="role-icon">
                  <RoleIcon />
                </span>
                <span className="role-name">{r.label}</span>
                <span className="role-desc">{r.desc}</span>
                <span className="role-foot">
                  <span className="role-hint">{r.loginHint}</span>
                  <span className="role-cta">
                    Se connecter <ChevronRight size={12} />
                  </span>
                </span>
              </button>
            );
          })}
        </div>

        <p className="role-footer">
          Pas encore de compte client ? <Link to="/signup">Créer un compte</Link>
        </p>
      </main>
    </div>
  );
}