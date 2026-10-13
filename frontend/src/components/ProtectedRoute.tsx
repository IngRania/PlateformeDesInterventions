import { Navigate, Outlet } from 'react-router-dom';
import { ReactElement } from 'react';
import { useAuth } from '../context/AuthContext';
import { spacesForRole } from '../config/spaces';

interface Props {
  children?: ReactElement;
  allowedRoles?: string[];
}

export default function ProtectedRoute({ children, allowedRoles }: Props) {
  const { user } = useAuth();

  if (!user) return <Navigate to="/login" replace />;

  if (user.must_change_password) return <Navigate to="/change-password" replace />;

  if (allowedRoles && !allowedRoles.includes(user.role)) {
    // Connecté mais pas autorisé ici : retour à son propre espace plutôt qu'à la connexion.
    const home = spacesForRole(user.role)[0]?.home ?? '/choisir-espace';
    return <Navigate to={home} replace />;
  }

  return children ?? <Outlet />;
}
