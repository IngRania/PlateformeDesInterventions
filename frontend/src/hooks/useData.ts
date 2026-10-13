import { useCallback, useEffect, useState } from 'react';
import { DashboardData, getDashboard, Intervention, listInterventions } from '../api/interventions';

/** Liste des interventions visibles par l'utilisateur, rafraîchie périodiquement. */
export function useInterventions(intervalMs = 10000) {
  const [items, setItems] = useState<Intervention[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const reload = useCallback(() => {
    listInterventions()
      .then((res) => { setItems(res.data); setError(null); })
      .catch(() => setError('Impossible de charger les interventions.'))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    reload();
    const interval = setInterval(reload, intervalMs);
    return () => clearInterval(interval);
  }, [reload, intervalMs]);

  return { items, loading, error, reload };
}

/** Indicateurs du tableau de bord (périmètre calculé côté serveur selon le rôle). */
export function useDashboard(intervalMs = 30000) {
  const [data, setData] = useState<DashboardData | null>(null);
  const [error, setError] = useState<string | null>(null);

  const reload = useCallback(() => {
    getDashboard()
      .then((res) => { setData(res.data); setError(null); })
      .catch(() => setError('Impossible de charger le tableau de bord.'));
  }, []);

  useEffect(() => {
    reload();
    const interval = setInterval(reload, intervalMs);
    return () => clearInterval(interval);
  }, [reload, intervalMs]);

  return { data, error, reload };
}
