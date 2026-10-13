// Partage de la position GPS du technicien.
// Monté une seule fois dans le layout : la position continue d'être envoyée
// pendant que le technicien navigue entre ses pages.
// Envoi par WebSocket (temps réel), avec repli automatique sur l'API HTTP
// /api/tracking/me/ si le WebSocket est indisponible.
import { createContext, ReactNode, useCallback, useContext, useEffect, useRef, useState } from 'react';
import { sendMyLocation, WS_LOCATION_URL } from '../api/tracking';

export type SharingStatus = 'off' | 'pending' | 'active' | 'denied' | 'unsupported' | 'error';

interface LocationState {
  enabled: boolean;
  status: SharingStatus;
  position: { latitude: number; longitude: number; accuracy: number } | null;
  lastSentAt: Date | null;
  channel: 'websocket' | 'http' | null;
  setEnabled: (value: boolean) => void;
}

const LocationContext = createContext<LocationState | undefined>(undefined);

const PREF_KEY = 'share_location';
const HTTP_MIN_INTERVAL_MS = 15000;

function readPref(): boolean {
  try { return localStorage.getItem(PREF_KEY) !== 'off'; } catch { return true; }
}

export function LocationProvider({ children }: { children: ReactNode }) {
  const [enabled, setEnabledState] = useState<boolean>(readPref);
  const [status, setStatus] = useState<SharingStatus>('off');
  const [position, setPosition] = useState<LocationState['position']>(null);
  const [lastSentAt, setLastSentAt] = useState<Date | null>(null);
  const [channel, setChannel] = useState<LocationState['channel']>(null);
  const wsRef = useRef<WebSocket | null>(null);
  const lastHttpRef = useRef(0);

  const setEnabled = useCallback((value: boolean) => {
    try { localStorage.setItem(PREF_KEY, value ? 'on' : 'off'); } catch { /* stockage indisponible */ }
    setEnabledState(value);
  }, []);

  useEffect(() => {
    if (!enabled) {
      setStatus('off');
      return;
    }
    if (!navigator.geolocation) {
      setStatus('unsupported');
      return;
    }

    setStatus('pending');
    const token = localStorage.getItem('access_token');
    let ws: WebSocket | null = null;
    if (token) {
      try {
        ws = new WebSocket(WS_LOCATION_URL(token));
        wsRef.current = ws;
      } catch {
        ws = null;
      }
    }

    const send = (latitude: number, longitude: number) => {
      if (ws && ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify({ latitude, longitude }));
        setChannel('websocket');
        setLastSentAt(new Date());
        return;
      }
      // Repli HTTP, limité pour ne pas surcharger l'API.
      const now = Date.now();
      if (now - lastHttpRef.current < HTTP_MIN_INTERVAL_MS) return;
      lastHttpRef.current = now;
      sendMyLocation(latitude, longitude)
        .then(() => {
          setChannel('http');
          setLastSentAt(new Date());
        })
        .catch(() => setStatus('error'));
    };

    const watchId = navigator.geolocation.watchPosition(
      (pos) => {
        const { latitude, longitude, accuracy } = pos.coords;
        setPosition({ latitude, longitude, accuracy });
        setStatus('active');
        send(latitude, longitude);
      },
      (err) => setStatus(err.code === err.PERMISSION_DENIED ? 'denied' : 'error'),
      { enableHighAccuracy: true, maximumAge: 5000, timeout: 15000 }
    );

    return () => {
      navigator.geolocation.clearWatch(watchId);
      ws?.close();
      wsRef.current = null;
    };
  }, [enabled]);

  return (
    <LocationContext.Provider value={{ enabled, status, position, lastSentAt, channel, setEnabled }}>
      {children}
    </LocationContext.Provider>
  );
}

export function useLocationSharing() {
  return useContext(LocationContext);
}
