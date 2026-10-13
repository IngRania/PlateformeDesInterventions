import api from './axios';

export interface Equipment {
  id: number;
  client: number;
  client_nom: string;
  client_email: string;
  type_equipement: string;
  reference: string;
  date_installation: string | null;
  notes: string;
  created_at: string;
}

export interface ClientMini {
  id: number;
  first_name: string;
  last_name: string;
  email: string;
}

export const listEquipments = (clientId?: number) =>
  api.get<Equipment[]>('/equipments/', { params: clientId ? { client: clientId } : {} });

export const createEquipment = (data: {
  client: number; type_equipement: string; reference: string;
  date_installation: string | null; notes: string;
}) => api.post<Equipment>('/equipments/', data);

export const updateEquipment = (id: number, data: Partial<Equipment>) =>
  api.patch<Equipment>(`/equipments/${id}/`, data);

export const deleteEquipment = (id: number) => api.delete(`/equipments/${id}/`);

export const listClients = () => api.get<ClientMini[]>('/equipments/clients/');

export const listMyEquipments = () =>
  api.get<{ id: number; type_equipement: string; reference: string }[]>('/equipments/mine/');