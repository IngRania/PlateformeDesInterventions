import { useEffect, useMemo, useState } from 'react';
import { Alert, Button, Form, Spinner, Table } from 'react-bootstrap';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { PersonPlusFill, Search } from 'react-bootstrap-icons';
import { useAuth } from '../../context/AuthContext';
import { listUsers, setUserActive, UserRow } from '../../api/users';
import { EmptyState, Loading, PageHeader } from '../../components/ui';
import { apiError, formatDate, initials, matchesSearch, roleLabels } from '../../utils/format';

const roleColors: Record<string, string> = {
  CLIENT: '#2563EB', TECHNICIEN: '#16A34A', RESPONSABLE: '#D97706', ADMIN: '#DC2626',
};

export default function AdminUsersPage() {
  const navigate = useNavigate();
  const { user: me } = useAuth();
  const [params] = useSearchParams();
  const [users, setUsers] = useState<UserRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [q, setQ] = useState(params.get('q') ?? '');
  const [role, setRole] = useState(params.get('role') ?? '');
  const [etat, setEtat] = useState('');
  const [busy, setBusy] = useState<number | null>(null);

  useEffect(() => { setQ(params.get('q') ?? ''); }, [params]);

  useEffect(() => {
    listUsers()
      .then((res) => setUsers(res.data))
      .catch(() => setError('Impossible de charger les utilisateurs.'))
      .finally(() => setLoading(false));
  }, []);

  const filtered = useMemo(() => users.filter((u) =>
    (!role || u.role === role) &&
    (!etat || (etat === 'actif') === u.is_active) &&
    matchesSearch(q, u.first_name, u.last_name, u.email, u.matricule, u.phone, roleLabels[u.role])
  ), [users, q, role, etat]);

  const toggle = async (u: UserRow) => {
    setBusy(u.id);
    setError(null);
    try {
      const res = await setUserActive(u.id, !u.is_active);
      setUsers((prev) => prev.map((x) => (x.id === u.id ? res.data : x)));
    } catch (err) {
      setError(apiError(err, 'Modification impossible.'));
    } finally {
      setBusy(null);
    }
  };

  return (
    <>
      <PageHeader
        eyebrow="Administration"
        title="Gestion des utilisateurs"
        subtitle={`${users.length} compte${users.length > 1 ? 's' : ''} sur la plateforme`}
        actions={
          <Button variant="primary" onClick={() => navigate('/admin/create-staff')}>
            <PersonPlusFill className="me-2" /> Créer un compte personnel
          </Button>
        }
      />
      {error && <Alert variant="danger" dismissible onClose={() => setError(null)}>{error}</Alert>}

      <div className="panel">
        <div className="toolbar">
          <div className="search-input">
            <Search />
            <Form.Control type="search" value={q} onChange={(e) => setQ(e.target.value)}
              placeholder="Nom, email, matricule, téléphone…" />
          </div>
          <Form.Select value={role} onChange={(e) => setRole(e.target.value)} className="toolbar-select">
            <option value="">Tous les rôles</option>
            {Object.entries(roleLabels).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
          </Form.Select>
          <Form.Select value={etat} onChange={(e) => setEtat(e.target.value)} className="toolbar-select">
            <option value="">Tous les états</option>
            <option value="actif">Actifs</option>
            <option value="inactif">Désactivés</option>
          </Form.Select>
          <span className="toolbar-count">{filtered.length} résultat{filtered.length > 1 ? 's' : ''}</span>
        </div>

        {loading ? <Loading /> : filtered.length === 0 ? (
          <EmptyState title="Aucun utilisateur" text="Modifiez la recherche ou les filtres." />
        ) : (
          <Table responsive hover className="data-table mb-0">
            <thead>
              <tr>
                <th>Utilisateur</th><th>Rôle</th><th>Matricule</th><th>Téléphone</th><th>Créé le</th><th>État</th>
                <th className="text-end">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((u) => (
                <tr key={u.id}>
                  <td>
                    <div className="d-flex align-items-center gap-2">
                      {u.avatar_url ? <img src={u.avatar_url} alt="" className="avatar-sm" /> :
                        <span className="avatar-sm">{initials(u.first_name, u.last_name)}</span>}
                      <div>
                        <div className="fw-semibold">{u.first_name} {u.last_name}</div>
                        <div className="cell-sub">{u.email}</div>
                      </div>
                    </div>
                  </td>
                  <td>
                    <span className="pill" style={{ ['--pill-color' as any]: roleColors[u.role] }}>
                      <span className="pill-dot" />{roleLabels[u.role]}
                    </span>
                  </td>
                  <td className="mono small">{u.matricule || '—'}</td>
                  <td className="small">{u.phone || '—'}</td>
                  <td className="small">{formatDate(u.created_at)}</td>
                  <td>
                    <span className="pill" style={{ ['--pill-color' as any]: u.is_active ? '#16A34A' : '#64748B' }}>
                      <span className="pill-dot" />{u.is_active ? 'Actif' : 'Désactivé'}
                    </span>
                  </td>
                  <td className="text-end">
                    {u.id !== me?.id && (
                      <Button
                        size="sm"
                        variant={u.is_active ? 'outline-danger' : 'outline-success'}
                        disabled={busy === u.id}
                        onClick={() => toggle(u)}
                      >
                        {busy === u.id ? <Spinner size="sm" animation="border" /> : u.is_active ? 'Désactiver' : 'Activer'}
                      </Button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </Table>
        )}
      </div>
    </>
  );
}
