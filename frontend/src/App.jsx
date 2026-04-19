import { BrowserRouter, Navigate, Outlet, Route, Routes, useLocation, useNavigate, useParams } from 'react-router-dom';
import LoginForm from './components/auth/LoginForm';
import IncidentDetail from './components/incidents/IncidentDetail';
import NewIncidentForm from './components/incidents/NewIncidentForm';
import Sidebar from './components/shared/Sidebar';
import { useAuth } from './context/AuthContext';
import Analytics from './pages/Analytics';
import Dashboard from './pages/Dashboard';
import PatientReport from './pages/PatientReport';
import Reports from './pages/Reports';
import WorkflowPage from './pages/WorkflowPage';

const PATH_BY_VIEW = {
  dashboard: '/dashboard',
  reports: '/incidents',
  'new-report': '/new',
  analytics: '/analytics',
  workflow: '/workflow',
};

function ProtectedRoute({ children, minTier }) {
  const { isAuthenticated, tier } = useAuth();
  if (!isAuthenticated) return <Navigate to="/login" replace />;
  if (typeof minTier === 'number' && tier < minTier) return <Navigate to="/dashboard" replace />;
  return children;
}

function RoleRoute({ children, allowedRoles }) {
  const { role } = useAuth();
  return allowedRoles.includes(role) ? children : <Navigate to="/dashboard" replace />;
}

function AppLayout() {
  const navigate = useNavigate();
  const { pathname } = useLocation();
  let currentView = pathname.slice(1).split('/')[0] || 'dashboard';
  if (pathname.startsWith('/incidents')) currentView = 'reports';
  if (pathname.startsWith('/new')) currentView = 'new-report';

  return (
    <div style={{ display: 'flex', minHeight: '100vh' }}>
      <Sidebar currentView={currentView} onNavigate={(view) => navigate(PATH_BY_VIEW[view] || '/dashboard')} />
      <main style={{ flex: 1, overflow: 'auto', padding: 16 }}>
        <Outlet />
      </main>
    </div>
  );
}

function IncidentDetailRoute() {
  const { id } = useParams();
  const { role } = useAuth();
  const navigate = useNavigate();
  return <IncidentDetail incidentId={id} role={role} onBack={() => navigate('/incidents')} />;
}

function FallbackRedirect() {
  const { isAuthenticated } = useAuth();
  return <Navigate to={isAuthenticated ? '/dashboard' : '/login'} replace />;
}

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<LoginForm />} />
        <Route path="/report/:uuid" element={<PatientReport />} />
        <Route
          element={
            <ProtectedRoute minTier={2}>
              <AppLayout />
            </ProtectedRoute>
          }
        >
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/incidents" element={<Reports />} />
          <Route path="/incidents/:id" element={<IncidentDetailRoute />} />
          <Route path="/new" element={<NewIncidentForm />} />
          <Route
            path="/analytics"
            element={
              <ProtectedRoute minTier={3}>
                <Analytics />
              </ProtectedRoute>
            }
          />
          <Route
            path="/workflow"
            element={
              <RoleRoute allowedRoles={['quality_admin', 'top_management']}>
                <WorkflowPage />
              </RoleRoute>
            }
          />
        </Route>
        <Route path="*" element={<FallbackRedirect />} />
      </Routes>
    </BrowserRouter>
  );
}
