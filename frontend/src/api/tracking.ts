import api from './axios';

export interface TechnicianPosition {
  technicien_id: number;
  technicien_nom: string;
  technicien_matricule?: string | null;
  technicien_telephone?: string | null;
  latitude: number;
  longitude: number;
  updated_at?: string;
  intervention_en_cours?: {
    id: number; type_panne: string; statut: string; client_nom: string;
  } | null;
}

export const WS_LOCATION_URL = (token: string) =>
  `${(api.defaults.baseURL || '').replace(/^http/, 'ws').replace(/\/api\/?$/, '')}/ws/location/?token=${token}`;

/** Positions actuelles de tous les techniciens (responsable / admin). */
export const listLocations = () => api.get<TechnicianPosition[]>('/tracking/locations/');

/** Dernière position partagée par le technicien connecté. */
export const getMyLocation = () => api.get<TechnicianPosition>('/tracking/me/');

/** Envoi HTTP de la position (secours si le WebSocket est indisponible). */
export const sendMyLocation = (latitude: number, longitude: number) =>
  api.post<TechnicianPosition>('/tracking/me/', { latitude, longitude });

/**
 * Adresse lisible d'une position (géocodage inverse OpenStreetMap / Nominatim).
 * Usage modéré (1 requête à la demande), conformément à la politique Nominatim.
 */
const addressCache = new Map<string, string>();

export async function reverseGeocode(latitude: number, longitude: number): Promise<string | null> {
  const key = `${latitude.toFixed(4)},${longitude.toFixed(4)}`;
  if (addressCache.has(key)) return addressCache.get(key)!;
  try {
    const res = await fetch(
      `https://nominatim.openstreetmap.org/reverse?format=jsonv2&accept-language=fr&zoom=17&lat=${latitude}&lon=${longitude}`
    );
    if (!res.ok) return null;
    const data = await res.json();
    const address: string | null = data?.display_name ?? null;
    if (address) addressCache.set(key, address);
    return address;
  } catch {
    return null;
  }
}

/** Une position est considérée « en ligne » si elle date de moins de 10 minutes. */
export const isOnline = (updatedAt?: string) =>
  !!updatedAt && Date.now() - new Date(updatedAt).getTime() < 10 * 60 * 1000;
