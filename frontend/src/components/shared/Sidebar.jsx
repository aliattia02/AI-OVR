// frontend/src/components/shared/Sidebar.jsx
//
// Change vs. previous version:
//  - Removed standalone { id: 'analytics' } from all roles — analytics is now
//    embedded inside IncidentReportsPage (see pages/IncidentReportsPage.jsx).

import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../../context/AuthContext';
import { USER_ROLES } from '../../utils/enums';
import { analyticsService } from '../../services/analytics';
import { useDirection } from '../../hooks/useDirection';

const ROLE_VIEWS = {
  patient: [
    { id: 'report-incident', labelKey: 'nav.items.report_incident' },
  ],
  staff: [
    { id: 'new-report', labelKey: 'nav.items.new_report' },
    { id: 'reports',    labelKey: 'nav.items.my_reports' },
  ],
  quality_admin: [
    { id: 'dashboard',        labelKey: 'common.page_titles.dashboard' },
    { id: 'new-report',       labelKey: 'nav.items.new_report' },
    { id: 'reports',          labelKey: 'nav.items.reports' },
    { id: 'incident-reports', labelKey: 'common.page_titles.incident_reports' },
    { id: 'workflow',         labelKey: 'nav.items.workflow' },
  ],
  administration_manager: [
    { id: 'dashboard',        labelKey: 'common.page_titles.dashboard' },
    { id: 'reports',          labelKey: 'nav.items.reports' },
    { id: 'incident-reports', labelKey: 'common.page_titles.incident_reports' },
    { id: 'workflow',         labelKey: 'nav.items.workflow' },
  ],
  governorate_manager: [
    { id: 'dashboard',        labelKey: 'common.page_titles.dashboard' },
    { id: 'reports',          labelKey: 'nav.items.reports' },
    { id: 'incident-reports', labelKey: 'common.page_titles.incident_reports' },
    { id: 'workflow',         labelKey: 'nav.items.workflow' },
  ],
  top_management: [
    { id: 'dashboard',        labelKey: 'common.page_titles.dashboard' },
    { id: 'reports',          labelKey: 'nav.items.reports' },
    { id: 'incident-reports', labelKey: 'common.page_titles.incident_reports' },
    { id: 'workflow',         labelKey: 'nav.items.workflow' },
    { id: 'admin-provision',  labelKey: 'nav.items.user_provisioning' },
  ],
};

export default function Sidebar({ onNavigate, currentView, onSignOut }) {
  const { role, tier } = useAuth();
  const { t }          = useTranslation();
  const { isRTL }      = useDirection();

  const roleMeta = USER_ROLES[role] || { label: t('nav.unknown_role'), tier: tier || 0 };
  const navItems = ROLE_VIEWS[role] || [];

  const { data: health } = useQuery({
    queryKey: ['health'],
    queryFn: analyticsService.getHealth,
    staleTime: 60_000,
  });

  const aiProvider      = String(health?.ai_provider || '').trim().toLowerCase();
  const aiModelName     = health?.ai_model || health?.model_name || health?.model || health?.ai_provider || 'Configured';
  const aiNotConfigured = !aiProvider || aiProvider === 'none';

  return (
    <aside
      className="sidebar"
      style={{
        width: 210,
        minWidth: 210,
        backgroundColor: '#0C2340',
        color: '#FFFFFF',
        display: 'flex',
        flexDirection: 'column',
        minHeight: '100vh',
        padding: '16px 12px',
        direction: isRTL ? 'rtl' : 'ltr',
      }}
    >
      {/* Header */}
      <div style={{ display: 'grid', gap: 6 }}>
        <div style={{ fontSize: 24, fontWeight: 800, letterSpacing: 0.2 }}>
          {t('common.brand_name')}
        </div>
        <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.90)', fontWeight: 600 }}>
          {t('nav.app_tagline')}
        </div>
        <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.68)' }} />

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
            {t('nav.patient_badge')}
          </div>
        )}
      </div>

      {/* Navigation */}
      <nav style={{ marginTop: 18, display: 'grid', gap: 4 }}>
        {navItems.map((item) => {
          const label    = t(item.labelKey);
          const isActive = currentView === item.id || currentView === item.labelKey;
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => onNavigate?.(item.id)}
              style={{
                textAlign: 'start',
                border: 'none',
                borderRadius: 10,
                backgroundColor: isActive ? 'rgba(255,255,255,0.13)' : 'transparent',
                color: '#FFFFFF',
                padding: '9px 10px',
                fontSize: 13,
                fontWeight: isActive ? 700 : 600,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                width: '100%',
              }}
            >
              {label}
            </button>
          );
        })}
      </nav>

      {/* Footer */}
      <div style={{ marginTop: 'auto', display: 'grid', gap: 8 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
          <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.90)', fontWeight: 700 }}>
            {roleMeta.label}
          </span>
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
            {t('common.tier_label', { tier: roleMeta.tier })}
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

        </div>

        <button
          type="button"
          onClick={() => onSignOut?.()}
          style={{
            textAlign: 'start',
            border: '1px solid rgba(255,255,255,0.25)',
            borderRadius: 10,
            backgroundColor: 'transparent',
            color: '#FFFFFF',
            padding: '9px 10px',
            fontSize: 13,
            fontWeight: 700,
            cursor: 'pointer',
          }}
        >
          {t('nav.sign_out')}
        </button>

        <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.35)', textAlign: 'center' }}>
          by{' '}
          <a
            href="https://medlytico.com"
            target="_blank"
            rel="noopener noreferrer"
            style={{ color: 'rgba(255,255,255,0.5)', textDecoration: 'none', fontWeight: 600 }}
            onMouseEnter={(e) => (e.currentTarget.style.color = '#fff')}
            onMouseLeave={(e) => (e.currentTarget.style.color = 'rgba(255,255,255,0.5)')}
          >
            medlytico.com
          </a>
        </div>
      </div>
    </aside>
  );
}