import api from './axios';

export interface Avis {
  id: number;
  note: number;
  commentaire: string;
  created_at: string;
}

export interface Intervention {
  id: number;
  client_nom: string;
  client_email: string;
  type_panne: string;
  description: string;
  priorite: 'BASSE' | 'NORMALE' | 'HAUTE' | 'URGENTE';
  date_souhaitee: string | null;
  statut: 'EN_ATTENTE' | 'AFFECTEE' | 'EN_COURS' | 'TERMINEE';
  technicien: number | null;
  technicien_nom: string | null;
  technicien_matricule: string | null;
  photo_avant_url: string | null;
  photo_apres_url: string | null;
  compte_rendu: string;
  avis: Avis | null;
  created_at: string;
  date_affectation: string | null;
  date_debut: string | null;
  date_cloture: string | null;
}

export interface Stats {
  par_statut: { statut: string; total: number }[];
  par_technicien: {
    technicien__first_name: string;
    technicien__last_name: string;
    technicien__matricule: string;
    total: number;
  }[];
  temps_moyen_resolution_heures: number | null;
  par_mois: { mois: string; total: number }[];
  total_interventions: number;
}

// ---------- Création / lecture ----------

export const createIntervention = (data: {
  type_panne: string;
  description: string;
  priorite: string;
  date_souhaitee: string | null;
}) => api.post<Intervention>('/interventions/create/', data);

export const listInterventions = (statut?: string) =>
  api.get<Intervention[]>('/interventions/', { params: statut ? { statut } : {} });

// ---------- Affectation (responsable) ----------

export const assignTechnicien = (id: number, technicien_id: number) =>
  api.patch<Intervention>(`/interventions/${id}/assign/`, { technicien_id });

// ---------- Changement de statut (technicien) ----------

export const updateStatut = (id: number, statut: string, compteRendu?: string) =>
  api.patch<Intervention>(`/interventions/${id}/status/`, {
    statut,
    ...(compteRendu !== undefined ? { compte_rendu: compteRendu } : {}),
  });

// ---------- Upload photos (technicien) ----------

export const uploadPhoto = (id: number, typePhoto: 'avant' | 'apres', file: File) => {
  const formData = new FormData();
  formData.append('type_photo', typePhoto);
  formData.append('photo', file);
  return api.post<Intervention>(`/interventions/${id}/photo/`, formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
};

// ---------- Rapport PDF ----------

export const downloadPDF = async (id: number) => {
  const res = await api.get(`/interventions/${id}/pdf/`, { responseType: 'blob' });
  const url = window.URL.createObjectURL(new Blob([res.data]));
  const link = document.createElement('a');
  link.href = url;
  link.setAttribute('download', `intervention_${id}.pdf`);
  document.body.appendChild(link);
  link.click();
  link.remove();
};

// ---------- Avis client ----------

export const submitAvis = (id: number, note: number, commentaire: string) =>
  api.post<Intervention>(`/interventions/${id}/avis/`, { note, commentaire });

// ---------- Calendrier (responsable) ----------

export const getCalendar = (start: string, end: string) =>
  api.get('/interventions/calendar/', { params: { start, end } });

// ---------- Statistiques (responsable/admin) ----------

export const getStats = () => api.get<Stats>('/interventions/stats/');

export async function generateDescription(typePanne: string): Promise<string> {
  const response = await api.post('/interventions/generate-description/', {
    type_panne: typePanne,
  });
  return response.data.description;
}