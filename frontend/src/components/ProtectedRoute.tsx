import { Navigate } from 'react-router-dom';
import { ReactElement } from 'react';
import { useAuth } from '../context/AuthContext';

interface Props {
  children: ReactElement;
  allowedRoles?: string[];
}

export default function ProtectedRoute({ children, allowedRoles }: Props) {
  const { user } = useAuth();

  if (!user) return <Navigate to="/login" replace />;

  if (user.must_change_password) return <Navigate to="/change-password" replace />;

  if (allowedRoles && !allowedRoles.includes(user.role)) {
    return <Navigate to="/login" replace />;
  }

  return children;
}