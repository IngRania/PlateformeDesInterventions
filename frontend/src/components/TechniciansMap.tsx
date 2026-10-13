import { useEffect, useRef, useState } from 'react';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import L, { Map as LeafletMap } from 'leaflet';
import icon from 'leaflet/dist/images/marker-icon.png';
import iconShadow from 'leaflet/dist/images/marker-shadow.png';
import api from '../api/axios';

const defaultIcon = L.icon({ iconUrl: icon, shadowUrl: iconShadow });
L.Marker.prototype.options.icon = defaultIcon;

interface TechnicianPosition {
  technicien_id: number;
  technicien_nom: string;
  latitude: number;
  longitude: number;
}

export default function TechniciansMap() {
  const accessToken = localStorage.getItem('access_token');
  const [positions, setPositions] = useState<Record<number, TechnicianPosition>>({});
  const mapRef = useRef<LeafletMap | null>(null);

  useEffect(() => {
    api.get<TechnicianPosition[]>('/tracking/locations/').then((res) => {
      const initial: Record<number, TechnicianPosition> = {};
      res.data.forEach((loc) => {
        initial[loc.technicien_id] = loc;
      });
      setPositions(initial);
    }).catch(() => {
      // pas grave si ça échoue, le WebSocket prendra le relais
    });
  }, []);

  useEffect(() => {
    if (!accessToken) return;
    const ws = new WebSocket(`ws://127.0.0.1:8000/ws/location/?token=${accessToken}`);

    ws.onmessage = (event) => {
      const data: TechnicianPosition = JSON.parse(event.data);
      setPositions((prev) => ({ ...prev, [data.technicien_id]: data }));
    };

    return () => ws.close();
  }, [accessToken]);

  // Force Leaflet à recalculer sa taille une fois le conteneur réellement dimensionné
  useEffect(() => {
    const timer = setTimeout(() => {
      mapRef.current?.invalidateSize();
    }, 200);

    const handleResize = () => mapRef.current?.invalidateSize();
    window.addEventListener('resize', handleResize);

    return () => {
      clearTimeout(timer);
      window.removeEventListener('resize', handleResize);
    };
  }, []);

  return (
    <div style={{ height: '500px', width: '100%', borderRadius: '8px', overflow: 'hidden' }}>
      <MapContainer
        ref={mapRef}
        center={[36.8065, 10.1815]}
        zoom={12}
        style={{ height: '100%', width: '100%' }}
        scrollWheelZoom={true}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        {Object.values(positions).map((tech) => (
          <Marker key={tech.technicien_id} position={[tech.latitude, tech.longitude]}>
            <Popup>{tech.technicien_nom || `Technicien #${tech.technicien_id}`}</Popup>
          </Marker>
        ))}
      </MapContainer>
    </div>
  );
}