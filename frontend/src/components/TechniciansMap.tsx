import { useEffect, useRef } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Circle } from 'react-leaflet';
import L, { Map as LeafletMap } from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { isOnline, TechnicianPosition } from '../api/tracking';
import { initials, timeAgo } from '../utils/format';

// Centre par défaut : Tunis
const DEFAULT_CENTER: [number, number] = [36.8065, 10.1815];

function techIcon(label: string, online: boolean, selected: boolean) {
  return L.divIcon({
    className: '',
    html: `<div class="map-pin ${online ? 'online' : 'offline'} ${selected ? 'selected' : ''}"><span>${label}</span></div>`,
    iconSize: [36, 44],
    iconAnchor: [18, 44],
    popupAnchor: [0, -40],
  });
}

interface Props {
  positions: TechnicianPosition[];
  selectedId?: number | null;
  onSelect?: (id: number) => void;
  height?: number | string;
  /** Rayon de précision (m) affiché autour de la première position. */
  accuracy?: number;
}

export default function TechniciansMap({ positions, selectedId, onSelect, height = 520, accuracy }: Props) {
  const mapRef = useRef<LeafletMap | null>(null);
  const fittedRef = useRef(false);

  // Cadre la carte sur l'ensemble des techniciens au premier affichage.
  useEffect(() => {
    const map = mapRef.current;
    if (!map || fittedRef.current || positions.length === 0) return;
    fittedRef.current = true;
    if (positions.length === 1) {
      map.setView([positions[0].latitude, positions[0].longitude], 15);
    } else {
      map.fitBounds(L.latLngBounds(positions.map((p) => [p.latitude, p.longitude] as [number, number])), { padding: [40, 40] });
    }
  }, [positions]);

  // Centre sur le technicien sélectionné dans la liste.
  useEffect(() => {
    const target = positions.find((p) => p.technicien_id === selectedId);
    if (target) mapRef.current?.flyTo([target.latitude, target.longitude], 16, { duration: 0.6 });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedId]);

  // Force Leaflet à recalculer sa taille une fois le conteneur réellement dimensionné
  useEffect(() => {
    const timer = setTimeout(() => mapRef.current?.invalidateSize(), 200);
    const handleResize = () => mapRef.current?.invalidateSize();
    window.addEventListener('resize', handleResize);
    return () => {
      clearTimeout(timer);
      window.removeEventListener('resize', handleResize);
    };
  }, []);

  return (
    <div className="map-box" style={{ height }}>
      <MapContainer ref={mapRef} center={DEFAULT_CENTER} zoom={12} style={{ height: '100%', width: '100%' }} scrollWheelZoom>
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        {!!accuracy && accuracy > 0 && positions[0] && (
          <Circle center={[positions[0].latitude, positions[0].longitude]} radius={accuracy}
            pathOptions={{ color: '#2563EB', fillOpacity: 0.08, weight: 1 }} />
        )}
        {positions.map((tech) => {
          const [first, ...rest] = (tech.technicien_nom || '').split(' ');
          const online = isOnline(tech.updated_at);
          return (
            <Marker
              key={tech.technicien_id}
              position={[tech.latitude, tech.longitude]}
              icon={techIcon(initials(first, rest.join(' ')), online, tech.technicien_id === selectedId)}
              eventHandlers={{ click: () => onSelect?.(tech.technicien_id) }}
            >
              <Popup>
                <strong>{tech.technicien_nom || `Technicien #${tech.technicien_id}`}</strong>
                {tech.technicien_matricule && <div>{tech.technicien_matricule}</div>}
                <div>{online ? 'En ligne' : 'Hors ligne'} · {timeAgo(tech.updated_at)}</div>
                {tech.intervention_en_cours && (
                  <div>{tech.intervention_en_cours.type_panne}</div>
                )}
              </Popup>
            </Marker>
          );
        })}
      </MapContainer>
    </div>
  );
}
