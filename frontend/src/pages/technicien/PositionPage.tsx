import { useEffect, useState } from 'react';
import { Alert, Button, Col, Form, Row } from 'react-bootstrap';
import { BoxArrowUpRight, GeoAltFill } from 'react-bootstrap-icons';
import { useAuth } from '../../context/AuthContext';
import { useLocationSharing } from '../../context/LocationContext';
import { getMyLocation, reverseGeocode, TechnicianPosition } from '../../api/tracking';
import TechniciansMap from '../../components/TechniciansMap';
import { EmptyState, PageHeader, Panel } from '../../components/ui';
import { formatDateTime } from '../../utils/format';

const statusText: Record<string, { label: string; variant: string }> = {
  active: { label: 'Votre position est partagée en temps réel avec le responsable maintenance.', variant: 'success' },
  pending: { label: 'Recherche de votre position GPS…', variant: 'info' },
  off: { label: 'Le partage de position est désactivé.', variant: 'secondary' },
  denied: { label: "Accès à la localisation refusé : autorisez-le dans les réglages du navigateur.", variant: 'danger' },
  unsupported: { label: "Ce navigateur ne permet pas la géolocalisation.", variant: 'danger' },
  error: { label: "Impossible d'obtenir ou d'envoyer la position. Nouvelle tentative en cours…", variant: 'warning' },
};

export default function PositionPage() {
  const { user } = useAuth();
  const sharing = useLocationSharing();
  const [saved, setSaved] = useState<TechnicianPosition | null>(null);
  const [address, setAddress] = useState<string | null>(null);

  useEffect(() => {
    getMyLocation().then((res) => setSaved(res.data || null)).catch(() => setSaved(null));
  }, [sharing?.lastSentAt]);

  const live = sharing?.position;
  const lat = live?.latitude ?? saved?.latitude;
  const lng = live?.longitude ?? saved?.longitude;

  // Adresse recalculée seulement quand la position bouge de façon notable (~100 m)
  const roundedKey = lat !== undefined && lng !== undefined ? `${lat.toFixed(3)},${lng.toFixed(3)}` : '';
  useEffect(() => {
    if (lat === undefined || lng === undefined) return;
    let cancelled = false;
    reverseGeocode(lat, lng).then((a) => { if (!cancelled) setAddress(a); });
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [roundedKey]);

  if (!sharing) return null;
  const status = statusText[sharing.status];

  return (
    <>
      <PageHeader
        eyebrow="Espace technicien"
        title="Ma position"
        subtitle="Le responsable maintenance voit votre position pour organiser les interventions."
      />
      <Alert variant={status.variant}>{status.label}</Alert>

      <Row className="g-3">
        <Col lg={4}>
          <Panel title="Partage GPS" className="mb-3">
            <Form.Check
              type="switch"
              id="share-location"
              label={sharing.enabled ? 'Partage activé' : 'Partage désactivé'}
              checked={sharing.enabled}
              onChange={(e) => sharing.setEnabled(e.target.checked)}
            />
            <p className="text-muted small mt-2 mb-0">
              La position est envoyée tant que l'application est ouverte, en temps réel (WebSocket)
              ou, à défaut, toutes les 15 secondes via l'API.
            </p>
          </Panel>

          <Panel title="Détails">
            <dl className="info-list">
              <div className="info-row"><dt>Coordonnées</dt><dd>{lat !== undefined && lng !== undefined ? `${lat.toFixed(5)}, ${lng.toFixed(5)}` : '—'}</dd></div>
              <div className="info-row"><dt>Adresse</dt><dd>{address ?? '—'}</dd></div>
              <div className="info-row"><dt>Précision</dt><dd>{live ? `± ${Math.round(live.accuracy)} m` : '—'}</dd></div>
              <div className="info-row"><dt>Dernier envoi</dt><dd>{sharing.lastSentAt ? formatDateTime(sharing.lastSentAt.toISOString()) : formatDateTime(saved?.updated_at)}</dd></div>
              <div className="info-row"><dt>Canal</dt><dd>{sharing.channel === 'websocket' ? 'Temps réel' : sharing.channel === 'http' ? 'API HTTP' : '—'}</dd></div>
            </dl>
            {lat !== undefined && lng !== undefined && (
              <Button
                variant="outline-primary"
                size="sm"
                className="mt-3"
                href={`https://www.openstreetmap.org/?mlat=${lat}&mlon=${lng}#map=17/${lat}/${lng}`}
                target="_blank"
                rel="noreferrer"
              >
                Ouvrir dans OpenStreetMap <BoxArrowUpRight className="ms-1" />
              </Button>
            )}
          </Panel>
        </Col>
        <Col lg={8}>
          <Panel flush className="overflow-hidden">
            {lat !== undefined && lng !== undefined ? (
              <TechniciansMap
                height={480}
                accuracy={live?.accuracy}
                positions={[{
                  technicien_id: user?.id ?? 0,
                  technicien_nom: `${user?.first_name ?? ''} ${user?.last_name ?? ''}`.trim(),
                  technicien_matricule: user?.matricule,
                  latitude: lat,
                  longitude: lng,
                  updated_at: sharing.lastSentAt?.toISOString() ?? saved?.updated_at,
                }]}
              />
            ) : (
              <EmptyState icon={GeoAltFill} title="Position inconnue" text="Activez le partage pour afficher votre position." />
            )}
          </Panel>
        </Col>
      </Row>
    </>
  );
}
