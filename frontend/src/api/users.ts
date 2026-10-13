import api from './axios';

export interface UserRow {
  id: number;
  email: string;
  first_name: string;
  last_name: string;
  phone: string;
  role: 'ADMIN' | 'RESPONSABLE' | 'TECHNICIEN' | 'CLIENT';
  matricule: string | null;
  avatar_url: string | null;
  is_active: boolean;
  created_at: string;
}

export const listUsers = () => api.get<UserRow[]>('/auth/users/');

export const setUserActive = (id: number, is_active: boolean) =>
  api.patch<UserRow>(`/auth/users/${id}/`, { is_active });
