import { useCallback, useEffect, useMemo, useState } from 'react';
import { Alert, Col, Form, Row } from 'react-bootstrap';
import { useNavigate } from 'react-router-dom';
import { GeoAltFill, Search, Telephone } from 'react-bootstrap-icons';
import {
  isOnline, listLocations, reverseGeocode, TechnicianPosition, WS_LOCATION_URL,
} from '../../api/tracking';
import TechniciansMap from '../../components/TechniciansMap';
import { EmptyState, PageHeader, Panel, StatutBadge } from '../../components/ui';
import { matchesSearch, timeAgo } from '../../utils/format';

export default function TrackingPage() {
  const navigate = useNavigate();
  const [positions, setPositions] = useState<Record<number, TechnicianPosition>>({});
  const [error, setError] = useState<string | null>(null);
  const [live, setLive] = useState(false);
  const [selected, setSelected] = useState<number | null>(null);
  const [address, setAddress] = useState<string | null>(null);
  const [q, setQ] = useState('');
  const [onlyOnline, setOnlyOnline] = useState(false);
  const [, setTick] = useState(0);

  const load = useCallback(() => {
    listLocations()
      .then((res) => {
        const next: Record<number, TechnicianPosition> = {};
        res.data.forEach((loc) => { next[loc.technicien_id] = loc; });
        setPositions(next);
        setError(null);
      })
      .catch(() => setError('Impossible de charger les positions des techniciens.'));
  }, []);

  // Positions initiales + rafraîchissement (interventions en cours) toutes les 30 s
  useEffect(() => {
    load();
    const interval = setInterval(load, 30000);
    // Re-rendu régulier pour actualiser « il y a x min »
    const ticker = setInterval(() => setTick((t) => t + 1), 30000);
    return () => { clearInterval(interval); clearInterval(ticker); };
  }, [load]);

  // Mises à jour temps réel via WebSocket
  useEffect(() => {
    const token = localStorage.getItem('access_token');
    if (!token) return;
    const ws = new WebSocket(WS_LOCATION_URL(token));
    ws.onopen = () => setLive(true);
    ws.onclose = () => setLive(false);
    ws.onmessage = (event) => {
      const data: TechnicianPosition = JSON.parse(event.data);
      setPositions((prev) => ({
        ...prev,
        [data.technicien_id]: { ...prev[data.technicien_id], ...data, updated_at: new Date().toISOString() },
      }));
    };
    return () => ws.close();
  }, []);

  const list = useMemo(() => Object.values(positions)
    .filter((p) => (!onlyOnline || isOnline(p.updated_at)) &&
      matchesSearch(q, p.technicien_nom, p.technicien_matricule, p.intervention_en_cours?.type_panne))
    .sort((a, b) => (b.updated_at ?? '').localeCompare(a.updated_at ?? '')), [positions, q, onlyOnline]);

  const onlineCount = Object.values(positions).filter((p) => isOnline(p.updated_at)).length;
  const selectedPos = selected ? positions[selected] : undefined;

  useEffect(() => {
    setAddress(null);
    if (!selectedPos) return;
    let cancelled = false;
    reverseGeocode(selectedPos.latitude, selectedPos.longitude).then((a) => { if (!cancelled) setAddress(a); });
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selected]);

  return (
    <>
      <PageHeader
        eyebrow="Suivi terrain"
        title="Localisation des techniciens"
        subtitle={
          <span className="d-inline-flex align-items-center gap-2">
            <span className={`live-dot ${live ? 'on' : ''}`} />
            {live ? 'Temps réel actif' : 'Temps réel indisponible — actualisation toutes les 30 s'}
            {' · '}{onlineCount} en ligne sur {Object.keys(positions).length}
          </span>
        }
      />
      {error && <Alert variant="danger">{error}</Alert>}

      <Row className="g-3">
        <Col lg={4} xl={3}>
          <Panel title="Techniciens" flush className="tracking-list">
            <div className="p-3 pb-2">
              <div className="search-input">
                <Search />
                <Form.Control type="search" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Nom, matricule…" />
              </div>
              <Form.Check
                type="switch"
                id="only-online"
                className="mt-2 small"
                label="En ligne uniquement"
                checked={onlyOnline}
                onChange={(e) => setOnlyOnline(e.target.checked)}
              />
            </div>
            {list.length === 0 ? (
              <EmptyState icon={GeoAltFill} title="Aucune position" text="Les techniciens apparaissent dès qu'ils partagent leur position." />
            ) : (
              <ul className="tech-list">
                {list.map((p) => {
                  const online = isOnline(p.updated_at);
                  return (
                    <li
                      key={p.technicien_id}
                      className={selected === p.technicien_id ? 'active' : ''}
                      onClick={() => setSelected(p.technicien_id)}
                    >
                      <span className={`presence ${online ? 'on' : ''}`} />
                      <div className="flex-grow-1 min-w-0">
                        <div className="fw-semibold text-truncate">{p.technicien_nom || `Technicien #${p.technicien_id}`}</div>
                        <div className="cell-sub">
                          <span className="mono">{p.technicien_matricule}</span> · {timeAgo(p.updated_at)}
                        </div>
                        {p.intervention_en_cours && (
                          <div className="cell-sub text-truncate">
                            {p.intervention_en_cours.type_panne}
                          </div>
                        )}
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
          </Panel>
        </Col>

        <Col lg={8} xl={9}>
          <Panel flush className="overflow-hidden">
            <TechniciansMap positions={list} selectedId={selected} onSelect={setSelected} height={560} />
          </Panel>

          {selectedPos && (
            <Panel className="mt-3" title={selectedPos.technicien_nom}>
              <Row className="g-3 small">
                <Col md={4}>
                  <div className="text-muted">Adresse approximative</div>
                  <div>{address ?? `${selectedPos.latitude.toFixed(5)}, ${selectedPos.longitude.toFixed(5)}`}</div>
                </Col>
                <Col md={4}>
                  <div className="text-muted">Dernière mise à jour</div>
                  <div>{timeAgo(selectedPos.updated_at)}</div>
                  {selectedPos.technicien_telephone && (
                    <a href={`tel:${selectedPos.technicien_telephone}`}><Telephone className="me-1" />{selectedPos.technicien_telephone}</a>
                  )}
                </Col>
                <Col md={4}>
                  <div className="text-muted">Intervention</div>
                  {selectedPos.intervention_en_cours ? (
                    <button
                      type="button"
                      className="link-btn p-0"
                      onClick={() => navigate(`/responsable/interventions/${selectedPos.intervention_en_cours!.id}`)}
                    >
                      {selectedPos.intervention_en_cours.type_panne}
                    </button>
                  ) : <div>Disponible</div>}
                  {selectedPos.intervention_en_cours && (
                    <div className="mt-1"><StatutBadge statut={selectedPos.intervention_en_cours.statut} /></div>
                  )}
                </Col>
              </Row>
            </Panel>
          )}
        </Col>
      </Row>
    </>
  );
}
