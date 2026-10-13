import { useEffect, useState } from 'react';
import { Container, Table, Badge, Navbar, Button, Spinner } from 'react-bootstrap';
import { useNavigate } from 'react-router-dom';
import { listInterventions, Intervention } from '../../api/interventions';
import { useAuth } from '../../context/AuthContext';

const statutColors: Record<string, string> = {
  EN_ATTENTE: 'secondary',
  AFFECTEE: 'info',
  EN_COURS: 'warning',
  TERMINEE: 'success',
};

export default function MyInterventionsPage() {
  const navigate = useNavigate();
  const { logout } = useAuth();
  const [items, setItems] = useState<Intervention[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    listInterventions().then((res) => setItems(res.data)).finally(() => setLoading(false));
  }, []);

  return (
    <div>
      <Navbar className="px-4 py-3" bg="primary" variant="dark">
        <Navbar.Brand className="fw-bold">Espace Client</Navbar.Brand>
        <div className="ms-auto d-flex gap-2">
          <Button variant="outline-light" size="sm" onClick={() => navigate('/client/nouvelle-demande')}>
            Nouvelle demande
          </Button>
          <Button variant="outline-light" size="sm" onClick={() => { logout(); navigate('/login'); }}>
            Déconnexion
          </Button>
        </div>
      </Navbar>

      <Container className="py-5">
        <h4 className="fw-bold mb-4">Mes demandes d'intervention</h4>
        {loading ? (
          <Spinner animation="border" />
        ) : items.length === 0 ? (
          <p className="text-muted">Aucune demande pour l'instant.</p>
        ) : (
          <Table responsive hover>
            <thead>
              <tr>
                <th>Type</th>
                <th>Priorité</th>
                <th>Statut</th>
                <th>Technicien</th>
                <th>Créée le</th>
              </tr>
            </thead>
            <tbody>
              {items.map((i) => (
                <tr key={i.id}>
                  <td>{i.type_panne}</td>
                  <td>{i.priorite}</td>
                  <td><Badge bg={statutColors[i.statut]}>{i.statut.replace('_', ' ')}</Badge></td>
                  <td>{i.technicien_nom || '—'}</td>
                  <td>{new Date(i.created_at).toLocaleDateString()}</td>
                </tr>
              ))}
            </tbody>
          </Table>
        )}
      </Container>
    </div>
  );
}