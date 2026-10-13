import { createContext, useContext, useState, ReactNode } from 'react';
import api from '../api/axios';

interface User {
  id: number;
  email: string;
  first_name: string;
  last_name: string;
  phone: string;
  role: 'ADMIN' | 'RESPONSABLE' | 'TECHNICIEN' | 'CLIENT';
  matricule: string | null;
  avatar_url: string | null;
  must_change_password: boolean;
}

interface AuthContextType {
  user: User | null;
  setUser: (user: User) => void;
  login: (identifiant: string, password: string) => Promise<void>;
  logout: () => void;
  loading: boolean;
  error: string | null;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(() => {
    const saved = localStorage.getItem('user');
    return saved ? JSON.parse(saved) : null;
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const login = async (identifiant: string, password: string) => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.post('/auth/login/', { identifiant, password });
      localStorage.setItem('access_token', res.data.access);
      localStorage.setItem('refresh_token', res.data.refresh);
      localStorage.setItem('user', JSON.stringify(res.data.user));
      setUser(res.data.user);
    } catch (err: any) {
      setError(err.response?.data?.non_field_errors?.[0] || 'Identifiant ou mot de passe incorrect.');
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const logout = () => {
    localStorage.clear();
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, setUser, login, logout, loading, error }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth doit être utilisé dans AuthProvider');
  return ctx;
}