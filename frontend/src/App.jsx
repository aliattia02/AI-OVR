// frontend/src/App.jsx
//
// Changes vs. previous version:
//  - Import: IncidentReportsPage now from './pages/IncidentReportsPage' (moved out of public/)
//  - Removed public route:   <Route path="/public/incidents" ... />
//  - Added protected route:  <Route path="/incident-reports" ... /> (minTier: 3)
//  - Added PATH_BY_VIEW entry for 'incident-reports'
//  - Removed Analytics import and /analytics route (merged into IncidentReportsPage)
//  - PATH_BY_VIEW 'analytics' now redirects to '/incident-reports'

import { BrowserRouter, Navigate, Outlet, Route, Routes, useLocation, useNavigate, useParams } from 'react-router-dom';
import { useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import LoginForm from './components/auth/LoginForm';
import IncidentDetail from './components/incidents/IncidentDetail';
import NewIncidentForm from './components/incidents/NewIncidentForm';
import Navbar from './components/shared/Navbar';
import Sidebar from './components/shared/Sidebar';
import SessionExpiryWarning from './components/shared/SessionExpiryWarning';
import { useAuth } from './context/AuthContext';
import AdminProvision from './pages/AdminProvision';
import ChangePassword from './pages/ChangePassword';
import Dashboard from './pages/Dashboard';
import IncidentReportsPage from './pages/IncidentReportsPage'; // ← moved from pages/public/
import MFASetup from './pages/MFASetup';
import MFAVerify from './pages/MFAVerify';
import PatientReport from './pages/PatientReport';
import Reports from './pages/Reports';
import WorkflowPage from './pages/WorkflowPage';
import AboutPage from './pages/public/AboutPage';
import LandingPage from './pages/public/LandingPage';
import StatisticsPage from './pages/public/StatisticsPage';
import StoryLibraryPage from './pages/public/StoryLibraryPage';

const PATH_BY_VIEW = {
  dashboard:         '/dashboard',
  reports:           '/incidents',
  'new-report':      '/new',
  analytics:         '/incident-reports', // merged into IncidentReportsPage
  workflow:          '/workflow',
  'admin-provision': '/admin/provision',
  'incident-reports': '/incident-reports', // ← new
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
  const { logout } = useAuth();
  const { pathname } = useLocation();
  const { i18n } = useTranslation();

  // Re-sync dir/lang when entering the authenticated area or when language changes.
  // Needed because LandingPage forces dir="rtl" and i18n.js only fires applyLanguageDirection
  // on languageChanged — not on component mount after a route transition.
  useEffect(() => {
    const dir = i18n.language === 'ar' ? 'rtl' : 'ltr';
    document.documentElement.dir  = dir;
    document.documentElement.lang = i18n.language;
  }, [i18n.language]);

  let currentView = pathname.slice(1).split('/')[0] || 'dashboard';
  if (pathname.startsWith('/incidents'))       currentView = 'reports';
  if (pathname.startsWith('/new'))             currentView = 'new-report';
  if (pathname.startsWith('/admin/provision')) currentView = 'admin-provision';
  if (pathname.startsWith('/incident-reports')) currentView = 'incident-reports'; // ← new

  const handleSignOut = async () => {
    await logout();
    navigate('/login', { replace: true });
  };

  const isRTL = i18n.language === 'ar';
  const SIDEBAR_WIDTH = 210;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
      <Navbar />
      <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
        <Sidebar
          currentView={currentView}
          onNavigate={(view) => navigate(PATH_BY_VIEW[view] || '/dashboard')}
          onSignOut={handleSignOut}
        />
        <main
          style={{
            flex: 1,
            overflow: 'auto',
            padding: 16,
            marginLeft: isRTL ? 0 : SIDEBAR_WIDTH,
            marginRight: isRTL ? SIDEBAR_WIDTH : 0,
          }}
        >
          <Outlet />
        </main>
      </div>
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
  return <Navigate to={isAuthenticated ? '/dashboard' : '/'} replace />;
}

const WORKFLOW_ROLES = ['quality_admin', 'top_management', 'administration_manager', 'governorate_manager'];

export default function App() {
  return (
    <BrowserRouter>
      <SessionExpiryWarning />
      <Routes>
        <Route path="/login"          element={<LoginForm />} />
        <Route path="/mfa/verify"     element={<MFAVerify />} />
        <Route path="/report/:uuid"   element={<PatientReport />} />
        <Route path="/change-password" element={<ChangePassword />} />

        {/* Public routes — /public/incidents intentionally removed */}
        <Route path="/"                  element={<LandingPage />} />
        <Route path="/public/statistics" element={<StatisticsPage />} />
        <Route path="/public/stories"    element={<StoryLibraryPage />} />
        <Route path="/public/about"      element={<AboutPage />} />

        <Route
          element={
            <ProtectedRoute minTier={2}>
              <AppLayout />
            </ProtectedRoute>
          }
        >
          <Route path="/dashboard"  element={<Dashboard />} />
          <Route path="/incidents"  element={<Reports />} />
          <Route path="/incidents/:id" element={<IncidentDetailRoute />} />
          <Route path="/new"        element={<NewIncidentForm />} />
          <Route path="/mfa/setup"  element={<MFASetup />} />
          <Route path="/account/password" element={<ChangePassword />} />

          {/* /analytics redirects to the unified IncidentReportsPage */}
          <Route path="/analytics" element={<Navigate to="/incident-reports" replace />} />

          {/* ── Incident Reports (admin) — was /public/incidents ─────────── */}
          <Route
            path="/incident-reports"
            element={
              <ProtectedRoute minTier={3}>
                <IncidentReportsPage />
              </ProtectedRoute>
            }
          />

          <Route
            path="/workflow"
            element={
              <RoleRoute allowedRoles={WORKFLOW_ROLES}>
                <WorkflowPage />
              </RoleRoute>
            }
          />
          <Route
            path="/admin/provision"
            element={
              <RoleRoute allowedRoles={['top_management']}>
                <AdminProvision />
              </RoleRoute>
            }
          />
        </Route>

        <Route path="*" element={<FallbackRedirect />} />
      </Routes>
    </BrowserRouter>
  );
}