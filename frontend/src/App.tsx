import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import ProtectedRoute from './components/ProtectedRoute';
import AppLayout from './components/AppLayout';

// Public / Auth
import LoginPage from './pages/LoginPage';
import SpaceSelectPage from './pages/SpaceSelectPage';
import SignupPage from './pages/SignupPage';
import ChangePasswordPage from './pages/ChangePasswordPage';
import ForgotPasswordPage from './pages/ForgotPasswordPage';
import ProfilePage from './pages/ProfilePage';
import InterventionDetailPage from './pages/InterventionDetailPage';

// Admin
import AdminDashboardPage from './pages/admin/AdminDashboardPage';
import AdminUsersPage from './pages/admin/AdminUsersPage';
import CreateStaffPage from './pages/CreateStaffPage';

// Client
import ClientDashboardPage from './pages/client/ClientDashboardPage';
import NewInterventionPage from './pages/client/NewInterventionPage';
import MyInterventionsPage from './pages/client/MyInterventionsPage';

// Responsable
import ResponsableDashboardPage from './pages/responsable/ResponsableDashboardPage';
import InterventionsListPage from './pages/responsable/InterventionsListPage';
import CalendarPage from './pages/responsable/CalendarPage';
import EquipmentsPage from './pages/responsable/EquipmentsPage';
import TrackingPage from './pages/responsable/TrackingPage';

// Technicien
import TechnicienDashboardPage from './pages/technicien/TechnicienDashboardPage';
import MyTasksPage from './pages/technicien/MyTasksPage';
import PositionPage from './pages/technicien/PositionPage';

function HomeRedirect() {
  const { user } = useAuth();
  return <Navigate to={user ? '/choisir-espace' : '/login'} replace />;
}

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          {/* ---------- Public / Auth ---------- */}
          <Route path="/" element={<HomeRedirect />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/staff-login" element={<Navigate to="/login" replace />} />
          <Route path="/signup" element={<SignupPage />} />
          <Route path="/change-password" element={<ChangePasswordPage />} />
          <Route path="/forgot-password" element={<ForgotPasswordPage />} />

          {/* Sélection du rôle / de l'espace, juste après la connexion */}
          <Route path="/choisir-espace" element={<SpaceSelectPage />} />

          {/* ---------- Espaces connectés (layout commun : sidebar + barre du haut) ---------- */}
          <Route element={<ProtectedRoute><AppLayout /></ProtectedRoute>}>
            {/* Admin */}
            <Route element={<ProtectedRoute allowedRoles={['ADMIN']} />}>
              <Route path="/admin/dashboard" element={<AdminDashboardPage />} />
              <Route path="/admin/utilisateurs" element={<AdminUsersPage />} />
              <Route path="/admin/create-staff" element={<CreateStaffPage />} />
              <Route path="/admin/profile" element={<ProfilePage />} />
            </Route>

            {/* Client */}
            <Route element={<ProtectedRoute allowedRoles={['CLIENT']} />}>
              <Route path="/client/dashboard" element={<ClientDashboardPage />} />
              <Route path="/client/nouvelle-demande" element={<NewInterventionPage />} />
              <Route path="/client/mes-interventions" element={<MyInterventionsPage />} />
              <Route path="/client/interventions/:id" element={<InterventionDetailPage />} />
              <Route path="/client/profile" element={<ProfilePage />} />
            </Route>

            {/* Responsable maintenance (accessible aussi à l'admin) */}
            <Route element={<ProtectedRoute allowedRoles={['RESPONSABLE', 'ADMIN']} />}>
              <Route path="/responsable/dashboard" element={<ResponsableDashboardPage />} />
              <Route path="/responsable/interventions" element={<InterventionsListPage />} />
              <Route path="/responsable/interventions/:id" element={<InterventionDetailPage />} />
              <Route path="/responsable/calendrier" element={<CalendarPage />} />
              <Route path="/responsable/equipements" element={<EquipmentsPage />} />
              <Route path="/responsable/tracking" element={<TrackingPage />} />
              <Route path="/responsable/profile" element={<ProfilePage />} />
            </Route>

            {/* Technicien */}
            <Route element={<ProtectedRoute allowedRoles={['TECHNICIEN']} />}>
              <Route path="/technicien/dashboard" element={<TechnicienDashboardPage />} />
              <Route path="/technicien/mes-taches" element={<MyTasksPage />} />
              <Route path="/technicien/interventions/:id" element={<InterventionDetailPage />} />
              <Route path="/technicien/position" element={<PositionPage />} />
              <Route path="/technicien/profile" element={<ProfilePage />} />
            </Route>
          </Route>

          <Route path="*" element={<HomeRedirect />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}
