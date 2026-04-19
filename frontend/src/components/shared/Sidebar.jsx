import { useQuery } from '@tanstack/react-query';
import { useAuth } from '../../context/AuthContext';
import { USER_ROLES } from '../../utils/enums';
import { analyticsService } from '../../services/analytics';

const ROLE_VIEWS = {
  patient: [{ id: 'report-incident', label: 'Report Incident' }],
  staff: [
    { id: 'new-report', label: 'New Report' },
    { id: 'reports', label: 'My Reports' },
  ],
  quality_admin: [
    { id: 'dashboard', label: 'Dashboard' },
    { id: 'new-report', label: 'New Report' },
    { id: 'reports', label: 'Reports' },
    { id: 'workflow', label: 'Workflow' },
  ],
  administration_manager: [
    { id: 'dashboard', label: 'Dashboard' },
    { id: 'reports', label: 'Reports' },
    { id: 'analytics', label: 'Analytics' },
  ],
  governorate_manager: [
    { id: 'dashboard', label: 'Dashboard' },
    { id: 'reports', label: 'Reports' },
    { id: 'analytics', label: 'Analytics' },
  ],
  top_management: [
    { id: 'dashboard', label: 'Dashboard' },
    { id: 'reports', label: 'Reports' },
    { id: 'analytics', label: 'Analytics' },
    { id: 'workflow', label: 'Workflow' },
    { id: 'admin-provision', label: 'User Provisioning' },
  ],
};

export default function Sidebar({ onNavigate, currentView }) {
  const { role, tier } = useAuth();
  const roleMeta = USER_ROLES[role] || { label: 'Unknown Role', tier: tier || 0 };
  const navItems = ROLE_VIEWS[role] || [];

  const { data: health } = useQuery({
    queryKey: ['health'],
    queryFn: analyticsService.getHealth,
    staleTime: 60_000,
  });

  const aiProvider = String(health?.ai_provider || '').trim().toLowerCase();
  const aiModelName = health?.ai_model || health?.model_name || health?.model || health?.ai_provider || 'Configured';
  const aiNotConfigured = !aiProvider || aiProvider === 'none';

  return (
    <aside
      style={{
        width: 210,
        minWidth: 210,
        backgroundColor: '#0C2340',
        color: '#FFFFFF',
        display: 'flex',
        flexDirection: 'column',
        minHeight: '100vh',
        padding: '16px 12px',
      }}
    >
      <div style={{ display: 'grid', gap: 6 }}>
        <div style={{ fontSize: 24, fontWeight: 800, letterSpacing: 0.2 }}>E·OVR</div>
        <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.90)', fontWeight: 600 }}>Occurrence Reporting</div>
        <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.68)' }}>6 Governorates · 348 Facilities</div>

        {role === 'patient' && (
          <div
            style={{
              marginTop: 6,
              fontSize: 11,
              width: 'fit-content',
              borderRadius: 999,
              backgroundColor: 'rgba(245, 158, 11, 0.18)',
              color: '#FDE68A',
              padding: '4px 8px',
              fontWeight: 700,
            }}
          >
            🔒 Anonymous · No login required
          </div>
        )}
      </div>

      <nav style={{ marginTop: 18, display: 'grid', gap: 4 }}>
        {navItems.map((item) => {
          const isActive = currentView === item.id || currentView === item.label;
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => onNavigate?.(item.id)}
              style={{
                textAlign: 'left',
                border: 'none',
                borderRadius: 10,
                backgroundColor: isActive ? 'rgba(255,255,255,0.13)' : 'transparent',
                color: '#FFFFFF',
                padding: '9px 10px',
                fontSize: 13,
                fontWeight: isActive ? 700 : 600,
                cursor: 'pointer',
              }}
            >
              {item.label}
            </button>
          );
        })}
      </nav>

      <div style={{ marginTop: 'auto', display: 'grid', gap: 8 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
          <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.90)', fontWeight: 700 }}>{roleMeta.label}</span>
          <span
            style={{
              fontSize: 10,
              borderRadius: 999,
              backgroundColor: 'rgba(255,255,255,0.18)',
              color: '#FFFFFF',
              padding: '3px 8px',
              fontWeight: 700,
            }}
          >
            Tier {roleMeta.tier}
          </span>
        </div>

        <div
          style={{
            fontSize: 11,
            borderRadius: 999,
            width: 'fit-content',
            padding: '4px 9px',
            fontWeight: 700,
            backgroundColor: aiNotConfigured ? 'rgba(245,158,11,0.20)' : 'rgba(16,185,129,0.18)',
            color: aiNotConfigured ? '#FCD34D' : '#86EFAC',
          }}
        >
          {aiNotConfigured ? 'AI: Not configured' : `AI: ${aiModelName}`}
        </div>
      </div>
    </aside>
  );
}
