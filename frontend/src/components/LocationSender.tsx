// frontend/src/components/LocationSender.tsx
// À monter une seule fois dans le layout technicien (ex: dans TechnicienLayout.tsx),
// il n'affiche rien mais tourne en fond tant que le technicien est connecté.
import { useEffect, useRef } from 'react';


export default function LocationSender() {
  const accessToken = localStorage.getItem('access_token'); // adapte le nom selon ton AuthContext existant
  const wsRef = useRef<WebSocket | null>(null);
  const watchIdRef = useRef<number | null>(null);

  useEffect(() => {
    if (!accessToken) return;

    const ws = new WebSocket(`ws://127.0.0.1:8000/ws/location/?token=${accessToken}`);
    wsRef.current = ws;

    ws.onopen = () => {
      if (!navigator.geolocation) {
        console.warn('Géolocalisation non supportée par ce navigateur.');
        return;
      }
      watchIdRef.current = navigator.geolocation.watchPosition(
        (position) => {
          const { latitude, longitude } = position.coords;
          if (ws.readyState === WebSocket.OPEN) {
            ws.send(JSON.stringify({ latitude, longitude }));
          }
        },
        (error) => console.error('Erreur géolocalisation:', error),
        { enableHighAccuracy: true, maximumAge: 5000, timeout: 10000 }
      );
    };

    ws.onerror = (e) => console.error('Erreur WebSocket:', e);

    return () => {
      if (watchIdRef.current !== null) {
        navigator.geolocation.clearWatch(watchIdRef.current);
      }
      ws.close();
    };
  }, [accessToken]);

  return null;
}