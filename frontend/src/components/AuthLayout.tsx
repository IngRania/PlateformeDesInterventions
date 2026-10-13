import { ReactNode } from 'react';

interface Props {
  children: ReactNode;
  brandTitle: string;
  brandSubtitle: string;
}

export default function AuthLayout({ children, brandTitle, brandSubtitle }: Props) {
  return (
    <div className="auth-split">
      <div className="auth-brand-panel">
        <div className="auth-brand-content">
          <div className="auth-brand-logo">
            <span className="brand-icon">⚙️</span> InTech Interventions
          </div>
          <h1 className="auth-brand-title">{brandTitle}</h1>
          <p className="auth-brand-subtitle">{brandSubtitle}</p>

          <ul className="auth-brand-features">
            <li>Gestion des interventions techniques</li>
            <li>Suivi en temps réel par rôle</li>
            <li>Sécurisé et centralisé</li>
          </ul>
        </div>
        <div className="auth-brand-shape auth-brand-shape-1" />
        <div className="auth-brand-shape auth-brand-shape-2" />
      </div>

      <div className="auth-form-panel">
        <div className="auth-form-card">{children}</div>
      </div>
    </div>
  );
}