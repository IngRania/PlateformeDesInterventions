import { ReactNode, useEffect, useMemo, useState } from 'react';
import { Button, Form, Table } from 'react-bootstrap';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { EyeFill, Search, XCircle } from 'react-bootstrap-icons';
import { Intervention } from '../api/interventions';
import { EmptyState, Loading, PrioriteBadge, StatutBadge } from './ui';
import {
  formatDate, matchesSearch, prioriteMeta, PRIORITES, statutMeta, STATUTS,
} from '../utils/format';

type Column = 'client' | 'technicien' | 'description';

interface Props {
  items: Intervention[];
  loading: boolean;
  /** Base de l'URL de détail, ex : "/client/interventions". */
  detailBase: string;
  columns?: Column[];
  /** Actions supplémentaires affichées à côté du bouton « Détails ». */
  renderActions?: (i: Intervention) => ReactNode;
  emptyAction?: ReactNode;
  initialStatut?: string;
}

const PRIORITY_ORDER: Record<string, number> = { URGENTE: 0, HAUTE: 1, NORMALE: 2, BASSE: 3 };

export default function InterventionsTable({
  items, loading, detailBase, columns = ['client', 'technicien'], renderActions, emptyAction, initialStatut = '',
}: Props) {
  const navigate = useNavigate();
  const [params, setParams] = useSearchParams();
  const [q, setQ] = useState(params.get('q') ?? '');
  const [statut, setStatut] = useState(params.get('statut') ?? initialStatut);
  const [priorite, setPriorite] = useState('');
  const [sort, setSort] = useState<'recent' | 'priorite' | 'date'>('recent');

  // La recherche de la barre du haut met à jour ?q= : on la reprend.
  useEffect(() => {
    setQ(params.get('q') ?? '');
  }, [params]);

  const updateQuery = (value: string) => {
    setQ(value);
    const next = new URLSearchParams(params);
    if (value) next.set('q', value); else next.delete('q');
    setParams(next, { replace: true });
  };

  const filtered = useMemo(() => {
    const rows = items.filter((i) =>
      (!statut || i.statut === statut) &&
      (!priorite || i.priorite === priorite) &&
      matchesSearch(
        q, i.type_panne, i.description, i.client_nom, i.client_email,
        i.technicien_nom, i.technicien_matricule, statutMeta[i.statut]?.label, prioriteMeta[i.priorite]?.label,
      )
    );
    if (sort === 'priorite') {
      rows.sort((a, b) => PRIORITY_ORDER[a.priorite] - PRIORITY_ORDER[b.priorite]);
    } else if (sort === 'date') {
      rows.sort((a, b) => (a.date_souhaitee ?? '9999').localeCompare(b.date_souhaitee ?? '9999'));
    }
    return rows;
  }, [items, q, statut, priorite, sort]);

  const hasFilters = !!(q || statut || priorite);
  const reset = () => {
    updateQuery('');
    setStatut('');
    setPriorite('');
  };

  const counts = useMemo(() => {
    const c: Record<string, number> = {};
    items.forEach((i) => { c[i.statut] = (c[i.statut] ?? 0) + 1; });
    return c;
  }, [items]);

  return (
    <div className="panel">
      <div className="status-tabs">
        <button type="button" className={`status-tab ${!statut ? 'active' : ''}`} onClick={() => setStatut('')}>
          Toutes <span className="status-count">{items.length}</span>
        </button>
        {STATUTS.map((s) => (
          <button
            type="button"
            key={s}
            className={`status-tab ${statut === s ? 'active' : ''}`}
            onClick={() => setStatut(s)}
            style={{ ['--tab-color' as any]: statutMeta[s].color }}
          >
            {statutMeta[s].label} <span className="status-count">{counts[s] ?? 0}</span>
          </button>
        ))}
      </div>

      <div className="toolbar">
        <div className="search-input">
          <Search />
          <Form.Control
            type="search"
            value={q}
            onChange={(e) => updateQuery(e.target.value)}
            placeholder="Rechercher (type, client, technicien…)"
          />
        </div>
        <Form.Select value={priorite} onChange={(e) => setPriorite(e.target.value)} className="toolbar-select">
          <option value="">Toutes priorités</option>
          {PRIORITES.map((p) => <option key={p} value={p}>{prioriteMeta[p].label}</option>)}
        </Form.Select>
        <Form.Select value={sort} onChange={(e) => setSort(e.target.value as any)} className="toolbar-select">
          <option value="recent">Plus récentes</option>
          <option value="priorite">Priorité la plus haute</option>
          <option value="date">Date souhaitée</option>
        </Form.Select>
        {hasFilters && (
          <Button variant="link" className="toolbar-reset" onClick={reset}>
            <XCircle className="me-1" /> Réinitialiser
          </Button>
        )}
        <span className="toolbar-count">{filtered.length} résultat{filtered.length > 1 ? 's' : ''}</span>
      </div>

      {loading ? (
        <Loading />
      ) : filtered.length === 0 ? (
        <EmptyState
          title={hasFilters ? 'Aucun résultat' : 'Aucune intervention'}
          text={hasFilters ? 'Modifiez la recherche ou les filtres.' : undefined}
          action={hasFilters ? <Button variant="outline-primary" size="sm" onClick={reset}>Effacer les filtres</Button> : emptyAction}
        />
      ) : (
        <Table responsive hover className="data-table mb-0">
          <thead>
            <tr>
              <th>Intervention</th>
              {columns.includes('client') && <th>Client</th>}
              {columns.includes('technicien') && <th>Technicien</th>}
              <th>Priorité</th>
              <th>Statut</th>
              <th>Date souhaitée</th>
              <th className="text-end">Actions</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((i) => (
              <tr key={i.id} className="row-clickable" onClick={() => navigate(`${detailBase}/${i.id}`)}>
                <td>
                  <div className="fw-semibold">{i.type_panne}</div>
                  {columns.includes('description') ? (
                    <div className="cell-sub cell-clamp">{i.description}</div>
                  ) : (
                    <div className="cell-sub">Créée le {formatDate(i.created_at)}</div>
                  )}
                </td>
                {columns.includes('client') && (
                  <td>
                    <div>{i.client_nom || '—'}</div>
                    <div className="cell-sub">{i.client_email}</div>
                  </td>
                )}
                {columns.includes('technicien') && (
                  <td>
                    {i.technicien_nom ? (
                      <>
                        <div>{i.technicien_nom}</div>
                        <div className="cell-sub mono">{i.technicien_matricule}</div>
                      </>
                    ) : <span className="text-muted">Non affectée</span>}
                  </td>
                )}
                <td><PrioriteBadge priorite={i.priorite} /></td>
                <td><StatutBadge statut={i.statut} /></td>
                <td className="small">{formatDate(i.date_souhaitee)}</td>
                <td className="text-end" onClick={(e) => e.stopPropagation()}>
                  <div className="row-actions">
                    {renderActions?.(i)}
                    <Button
                      size="sm"
                      variant="outline-primary"
                      onClick={() => navigate(`${detailBase}/${i.id}`)}
                    >
                      <EyeFill className="me-1" /> Détails
                    </Button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </Table>
      )}
    </div>
  );
}
