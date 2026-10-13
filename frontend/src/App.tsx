import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import ProtectedRoute from './components/ProtectedRoute';

// Public / Auth
import RoleSelectPage from './pages/RoleSelectPage';
import ClientLoginPage from './pages/ClientLoginPage';
import StaffLoginPage from './pages/StaffLoginPage';
import SignupPage from './pages/SignupPage';
import ChangePasswordPage from './pages/ChangePasswordPage';
import ForgotPasswordPage from './pages/ForgotPasswordPage';
import ProfilePage from './pages/ProfilePage';

// Admin
import AdminDashboardPage from './pages/AdminDashboardPage';
import CreateStaffPage from './pages/CreateStaffPage';

// Client
import ClientDashboardPage from './pages/client/ClientDashboardPage';
import NewInterventionPage from './pages/client/NewInterventionPage';
import MyInterventionsPage from './pages/client/MyInterventionsPage';

// Responsable
import InterventionsListPage from './pages/responsable/InterventionsListPage';
import CalendarPage from './pages/responsable/CalendarPage';
import EquipmentsPage from './pages/responsable/EquipmentsPage';
import TrackingPage from './pages/responsable/TrackingPage';

// Technicien
import MyTasksPage from './pages/technicien/MyTasksPage';

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          {/* ---------- Public / Auth ---------- */}
          <Route path="/" element={<RoleSelectPage />} />
          <Route path="/login" element={<ClientLoginPage />} />
          <Route path="/staff-login" element={<StaffLoginPage />} />
          <Route path="/signup" element={<SignupPage />} />
          <Route path="/change-password" element={<ChangePasswordPage />} />
          <Route path="/forgot-password" element={<ForgotPasswordPage />} />

          {/* ---------- Admin ---------- */}
          <Route
            path="/admin/dashboard"
            element={
              <ProtectedRoute allowedRoles={['ADMIN']}>
                <AdminDashboardPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/create-staff"
            element={
              <ProtectedRoute allowedRoles={['ADMIN']}>
                <CreateStaffPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/profile"
            element={
              <ProtectedRoute allowedRoles={['ADMIN']}>
                <ProfilePage />
              </ProtectedRoute>
            }
          />

          {/* ---------- Client ---------- */}
          <Route
            path="/client/dashboard"
            element={
              <ProtectedRoute allowedRoles={['CLIENT']}>
                <ClientDashboardPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/client/nouvelle-demande"
            element={
              <ProtectedRoute allowedRoles={['CLIENT']}>
                <NewInterventionPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/client/mes-interventions"
            element={
              <ProtectedRoute allowedRoles={['CLIENT']}>
                <MyInterventionsPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/client/profile"
            element={
              <ProtectedRoute allowedRoles={['CLIENT']}>
                <ProfilePage />
              </ProtectedRoute>
            }
          />

          {/* ---------- Responsable ---------- */}
          <Route
            path="/responsable/interventions"
            element={
              <ProtectedRoute allowedRoles={['RESPONSABLE', 'ADMIN']}>
                <InterventionsListPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/responsable/calendrier"
            element={
              <ProtectedRoute allowedRoles={['RESPONSABLE', 'ADMIN']}>
                <CalendarPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/responsable/equipements"
            element={
              <ProtectedRoute allowedRoles={['RESPONSABLE', 'ADMIN']}>
                <EquipmentsPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/responsable/tracking"
            element={
              <ProtectedRoute allowedRoles={['RESPONSABLE', 'ADMIN']}>
                <TrackingPage />
              </ProtectedRoute>
            }
          />

          {/* ---------- Technicien ---------- */}
          <Route
            path="/technicien/mes-taches"
            element={
              <ProtectedRoute allowedRoles={['TECHNICIEN']}>
                <MyTasksPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/technicien/profile"
            element={
              <ProtectedRoute allowedRoles={['TECHNICIEN', 'ADMIN']}>
                <ProfilePage />
              </ProtectedRoute>
            }
          />

          {/* ---------- Profil (partagé par tous les rôles connectés) ---------- */}
          <Route
            path="/client/profile"
            element={
              <ProtectedRoute allowedRoles={['CLIENT', 'ADMIN', 'TECHNICIEN', 'RESPONSABLE']}>
                <ProfilePage />
              </ProtectedRoute>
            }
          />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}