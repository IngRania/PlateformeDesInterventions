import { ReactNode } from 'react';
import { CheckCircleFill, GearFill } from 'react-bootstrap-icons';

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
            <span className="brand-mark"><GearFill /></span> InTech Interventions
          </div>
          <h1 className="auth-brand-title">{brandTitle}</h1>
          <p className="auth-brand-subtitle">{brandSubtitle}</p>

          <ul className="auth-brand-features">
            <li><CheckCircleFill /> Demandes d'intervention assistées par IA</li>
            <li><CheckCircleFill /> Suivi en temps réel et localisation des techniciens</li>
            <li><CheckCircleFill /> Rapports PDF et tableaux de bord par rôle</li>
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
