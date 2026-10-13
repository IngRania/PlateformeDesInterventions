import { Container, Navbar, Button } from 'react-bootstrap';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import TechniciansMap from '../../components/TechniciansMap';

export default function TrackingPage() {
  const navigate = useNavigate();
  const { logout } = useAuth();

  return (
    <div>
      <Navbar className="app-navbar px-4 py-3">
        <Navbar.Brand className="fw-bold">Espace Responsable</Navbar.Brand>
        <div className="ms-auto d-flex gap-2">
          <Button variant="outline-light" size="sm" onClick={() => navigate('/responsable/interventions')}>
            Demandes
          </Button>
          <Button variant="outline-light" size="sm" onClick={() => navigate('/responsable/calendrier')}>
            Calendrier
          </Button>
          <Button variant="outline-light" size="sm" onClick={() => navigate('/responsable/equipements')}>
            Équipements
          </Button>
          <Button variant="outline-light" size="sm" onClick={() => { logout(); navigate('/login'); }}>
            Déconnexion
          </Button>
        </div>
      </Navbar>

      <Container className="py-5">
        <div className="page-header">
          <div className="page-eyebrow">SUIVI TERRAIN</div>
          <h4 className="fw-bold mb-0">Localisation des techniciens</h4>
        </div>

        <div className="app-card" style={{ overflow: 'hidden' }}>
          <TechniciansMap />
        </div>
      </Container>
    </div>
  );
}