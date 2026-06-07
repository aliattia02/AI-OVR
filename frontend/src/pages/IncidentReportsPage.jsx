// frontend/src/pages/IncidentReportsPage.jsx
//
// Unified page: Incident Reports + Analytics
//
// Analytics (KPIs, trend chart, severity pie, category breakdown) are sourced
// directly from useAnalyticsSummary, useAnalyticsTrends, and useIncidents.
// The standalone AnalyticsDashboard component is no longer used here.
//
// Category breakdown counts by `error_classification` fetched via useIncidents.
// Fixes:
//   - PREDEFINED_CATEGORIES keys now match ERROR_CLASSIFICATIONS in enums.js
//     (were stale PascalCase names like 'MedicationError'; DB stores 'Medication')
//   - Expanded from 6 → 8 categories to cover all enum values (no incident uncounted)
//   - effectiveFilters forwarded to useIncidents so cards respect the filter bar

import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  Legend,
} from 'recharts';
import { useAuth }                              from '../context/AuthContext';
import { useDirection }                         from '../hooks/useDirection';
import { useAnalyticsSummary, useAnalyticsTrends } from '../hooks/useAnalytics';
import { useIncidents }                         from '../hooks/useIncidents';
import DashboardFilterBar                       from '../components/analytics/DashboardFilterBar';
import TrendChart                               from '../components/analytics/TrendChart';
import EmptyState                               from '../components/shared/EmptyState';
import Spinner                                  from '../components/shared/Spinner';

// ── Constants ──────────────────────────────────────────────────────────────

// ── Design tokens ──────────────────────────────────────────────────────────

const C = {
  navy:      '#0C2340',
  teal:      '#0B7D6B',
  tealLight: '#E0F5F1',
  ivory:     '#F5F7FA',
  g200:      '#E5E7EB',
  g400:      '#9CA3AF',
  g600:      '#4B5563',
  white:     '#FFFFFF',
};

const PIE_COLORS = [
  '#0B7D6B', '#1B6CA8', '#D97706', '#6D28D9',
  '#EF4444', '#9CA3AF', '#DC2626', '#059669',
  '#7C3AED', '#B45309', '#0369A1', '#BE123C',
  '#15803D', '#9333EA',
];

const EMPTY_FILTERS = {
  governorate:          '',
  administration:       '',
  facility_type:        '',
  facility_name:        '',
  creation_from:        '',
  creation_to:          '',
  occurrence_from:      '',
  occurrence_to:        '',
  error_classification: '',
};

// ── Category definitions ───────────────────────────────────────────────────
//
// Keys MUST match ERROR_CLASSIFICATIONS in src/utils/enums.js exactly.
// Each entry maps one enum value → one display card.
// `labelKey` is resolved through i18next so the label is language-aware.

// ── Category definitions ───────────────────────────────────────────────────
//
// Keys MUST match ERROR_CLASSIFICATIONS in src/utils/enums.js exactly.
// 14 entries → 2 rows × 7 columns in the reports grid.
// `labelKey` is resolved through i18next so the label is language-aware.

// ── Category definitions ───────────────────────────────────────────────────
//
// Keys MUST match ERROR_CLASSIFICATIONS in src/utils/enums.js exactly.
// 14 entries → 2 rows × 7 columns in the reports grid.
//
// labelKey reuses incidents.classification.* — the same keys the new-incident
// form dropdown uses — so no extra translation strings are needed.
// Key format: incidents.classification.${classificationKey.toLowerCase()}

const PREDEFINED_CATEGORIES = [
  { icon: '🩺', labelKey: 'incidents.classification.patientsafety',              classificationKeys: ['PatientSafety'] },
  { icon: '💊', labelKey: 'incidents.classification.medicationsafety',            classificationKeys: ['MedicationSafety'] },
  { icon: '🦠', labelKey: 'incidents.classification.infectionprevention',         classificationKeys: ['InfectionPrevention'] },
  { icon: '🩸', labelKey: 'incidents.classification.bloodtransfusion',            classificationKeys: ['BloodTransfusion'] },
  { icon: '🔬', labelKey: 'incidents.classification.laboratory',                  classificationKeys: ['Laboratory'] },
  { icon: '🫁', labelKey: 'incidents.classification.radiologydiagnostic',         classificationKeys: ['RadiologyDiagnostic'] },
  { icon: '🔧', labelKey: 'incidents.classification.medicalequipment',            classificationKeys: ['MedicalEquipment'] },
  { icon: '🏥', labelKey: 'incidents.classification.facilityenvironmental',       classificationKeys: ['FacilityEnvironmental'] },
  { icon: '👷', labelKey: 'incidents.classification.occupationalhealthstaff',     classificationKeys: ['OccupationalHealthStaff'] },
  { icon: '🔒', labelKey: 'incidents.classification.security',                    classificationKeys: ['Security'] },
  { icon: '💻', labelKey: 'incidents.classification.informationtechnology',       classificationKeys: ['InformationTechnology'] },
  { icon: '📋', labelKey: 'incidents.classification.administrativeprocess',       classificationKeys: ['AdministrativeProcess'] },
  { icon: '🤝', labelKey: 'incidents.classification.patientexperiencecomplaints', classificationKeys: ['PatientExperienceComplaints'] },
  { icon: '🔥', labelKey: 'incidents.classification.firedisaster',                classificationKeys: ['FireDisaster'] },
];

// ── Helpers ────────────────────────────────────────────────────────────────

function sumCounts(items = []) {
  return (items || []).reduce((sum, row) => sum + (Number(row?.count) || 0), 0);
}

function toMap(items = []) {
  return (items || []).reduce((acc, row) => {
    if (!row?.key) return acc;
    acc[row.key] = Number(row.count) || 0;
    return acc;
  }, {});
}

// ── Sub-components ─────────────────────────────────────────────────────────

function HeroKPI({ label, value, accent = 'rgba(255,255,255,0.9)' }) {
  return (
    <div
      style={{
        display:       'flex',
        flexDirection: 'column',
        alignItems:    'center',
        gap:           2,
        padding:       '12px 24px',
        borderRadius:  14,
        background:    'rgba(255,255,255,0.08)',
        border:        '1px solid rgba(255,255,255,0.15)',
        minWidth:      100,
      }}
    >
      <span style={{ fontSize: 28, fontWeight: 900, color: accent, letterSpacing: '-0.03em', lineHeight: 1 }}>
        {value}
      </span>
      <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.55)', fontWeight: 600, textAlign: 'center' }}>
        {label}
      </span>
    </div>
  );
}

function CategoryCard({ icon, label, count, total, isSelected = false, onClick, filteredLabel }) {
  const pct = total > 0 ? Math.round((count / total) * 100) : 0;
  return (
    <div
      role="button"
      tabIndex={0}
      onClick={onClick}
      onKeyDown={(e) => e.key === 'Enter' && onClick?.()}
      style={{
        background:   isSelected ? C.tealLight : C.ivory,
        borderRadius: 12,
        padding:      '14px 10px',
        border:       `2px solid ${isSelected ? C.teal : C.g200}`,
        textAlign:    'center',
        transition:   'transform 0.2s, opacity 0.2s, box-shadow 0.2s, border-color 0.2s, background 0.2s',
        cursor:       'pointer',
        opacity:      isSelected ? 1 : 0.88,
        boxShadow:    isSelected ? `0 0 0 3px ${C.teal}22` : 'none',
        userSelect:   'none',
        minWidth:     0,
        overflow:     'hidden',
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.transform  = 'translateY(-3px)';
        e.currentTarget.style.opacity    = '1';
        e.currentTarget.style.boxShadow  = isSelected
          ? `0 8px 24px rgba(11,125,107,0.20), 0 0 0 3px ${C.teal}22`
          : '0 8px 24px rgba(12,35,64,0.10)';
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.transform  = 'translateY(0)';
        e.currentTarget.style.opacity    = isSelected ? '1' : '0.88';
        e.currentTarget.style.boxShadow  = isSelected ? `0 0 0 3px ${C.teal}22` : 'none';
      }}
    >
      <div style={{ fontSize: 24, marginBottom: 7 }}>{icon}</div>

      <div
        style={{
          fontSize:      22,
          fontWeight:    900,
          color:         isSelected ? C.teal : C.navy,
          letterSpacing: '-0.03em',
          fontFamily:    '"Georgia", serif',
          lineHeight:    1.1,
          marginBottom:  4,
          transition:    'color 0.2s',
        }}
      >
        {count.toLocaleString()}
      </div>

      <div style={{
        fontSize:     11,
        color:        isSelected ? C.teal : C.g600,
        fontWeight:   isSelected ? 700 : 500,
        marginBottom: 8,
        transition:   'color 0.2s',
        wordBreak:    'break-word',
        overflowWrap: 'anywhere',
        lineHeight:   1.3,
      }}>
        {label}
      </div>

      <div style={{ height: 3, borderRadius: 999, backgroundColor: C.g200, overflow: 'hidden' }}>
        <div
          style={{
            height:          '100%',
            width:           `${pct}%`,
            backgroundColor: C.teal,
            borderRadius:    999,
            transition:      'width 0.5s ease',
          }}
        />
      </div>

      <div style={{ fontSize: 10, color: isSelected ? C.teal : C.g400, fontWeight: 700, marginTop: 5 }}>
        {pct}%
      </div>

      {isSelected && (
        <div style={{ marginTop: 8, fontSize: 10, fontWeight: 700, color: C.teal, letterSpacing: '0.04em' }}>
          {filteredLabel}
        </div>
      )}
    </div>
  );
}

function SectionTitle({ children }) {
  return (
    <div style={{ fontSize: 15, fontWeight: 700, color: '#111827', marginBottom: 14 }}>
      {children}
    </div>
  );
}

// ── Main component ─────────────────────────────────────────────────────────

export default function IncidentReportsPage() {
  const { tier, user } = useAuth();
  const { isRTL }      = useDirection();
  const { t }          = useTranslation();

  const isFacilityScoped   = tier === 2;
  const lockedFacilityName = isFacilityScoped ? (user?.facility_name ?? '') : null;

  const [filters, setFilters] = useState(EMPTY_FILTERS);

  const effectiveFilters = useMemo(
    () => isFacilityScoped ? { ...filters, facility_name: lockedFacilityName } : filters,
    [filters, isFacilityScoped, lockedFacilityName],
  );

  // ── Analytics (KPIs + trend chart + severity pie) ──────────────────────
  const {
    data:       summary,
    isLoading:  summaryLoading,
    isFetching: summaryFetching,
    error:      summaryError,
  } = useAnalyticsSummary(effectiveFilters);

  const {
    data:       trends,
    isLoading:  trendsLoading,
    isFetching: trendsFetching,
    error:      trendsError,
  } = useAnalyticsTrends(effectiveFilters);

  // ── Raw incidents (for error_classification breakdown) ─────────────────
  // We fetch up to 1 000 records and count by error_classification locally.
  // This is correct because the analytics endpoint groups by `event_type`
  // (NearMiss / AdverseEvent / …), NOT by error_classification.
  // effectiveFilters is passed so the category cards stay in sync with the
  // filter bar (governorate, facility, date range, etc.).
  const {
    data:      incidentsList,
    isLoading: incidentsLoading,
    error:     incidentsError,
  } = useIncidents({ pageSize: 1000, filters: effectiveFilters });

  // ── Derived: KPI numbers from analytics ────────────────────────────────
  const statusCounts   = useMemo(() => toMap(summary?.status),    [summary?.status]);
  const totalIncidents = useMemo(() => sumCounts(summary?.status), [summary?.status]);
  const openIncidents  = Math.max(0, totalIncidents - (statusCounts.Completed || 0));
  const highRisk       = useMemo(
    () => Number((summary?.severity || []).find((r) => r?.key === 'Major')?.count ?? 0),
    [summary?.severity],
  );

  // ── Derived: category counts from error_classification ─────────────────
  // NOTE: the /incidents/ endpoint applies JWT-scope filtering only and does
  // NOT honour governorate / facility / date query params the way the analytics
  // endpoint does.  We therefore filter the raw list client-side so that the
  // category cards stay in sync with every filter the user sets.
  const filteredIncidents = useMemo(() => {
    const items = Array.isArray(incidentsList) ? incidentsList : [];
    if (!items.length) return items;

    return items.filter((inc) => {
      if (!inc) return false;

      // governorate
      if (effectiveFilters.governorate &&
          inc.governorate !== effectiveFilters.governorate) return false;

      // administration
      if (effectiveFilters.administration &&
          inc.administration !== effectiveFilters.administration) return false;

      // facility_type
      if (effectiveFilters.facility_type &&
          inc.facility_type !== effectiveFilters.facility_type) return false;

      // facility_name
      if (effectiveFilters.facility_name &&
          inc.facility_name !== effectiveFilters.facility_name) return false;

      // error_classification (card-click filter)
      if (effectiveFilters.error_classification &&
          inc.error_classification !== effectiveFilters.error_classification) return false;

      // creation date range  (inc.created_at assumed ISO string)
      if (effectiveFilters.creation_from) {
        const d = new Date(inc.created_at ?? inc.creation_date ?? '');
        if (isNaN(d) || d < new Date(effectiveFilters.creation_from)) return false;
      }
      if (effectiveFilters.creation_to) {
        const d = new Date(inc.created_at ?? inc.creation_date ?? '');
        if (isNaN(d) || d > new Date(effectiveFilters.creation_to + 'T23:59:59')) return false;
      }

      // occurrence date range  (inc.occurrence_date assumed ISO string)
      if (effectiveFilters.occurrence_from) {
        const d = new Date(inc.occurrence_date ?? '');
        if (isNaN(d) || d < new Date(effectiveFilters.occurrence_from)) return false;
      }
      if (effectiveFilters.occurrence_to) {
        const d = new Date(inc.occurrence_date ?? '');
        if (isNaN(d) || d > new Date(effectiveFilters.occurrence_to + 'T23:59:59')) return false;
      }

      return true;
    });
  }, [incidentsList, effectiveFilters]);

  const classificationMap = useMemo(() => {
    return filteredIncidents.reduce((acc, inc) => {
      const cls = inc?.error_classification;
      if (!cls) return acc;
      acc[cls] = (acc[cls] || 0) + 1;
      return acc;
    }, {});
  }, [filteredIncidents]);

  const categoryCards = useMemo(
    () =>
      PREDEFINED_CATEGORIES.map((cat) => ({
        ...cat,
        label: t(cat.labelKey),
        count: cat.classificationKeys.reduce(
          (sum, k) => sum + (classificationMap[k] || 0),
          0,
        ),
      })),
    [classificationMap, t],
  );

  // Total across categories (denominator for % bars)
  const totalByCategory = useMemo(
    () => categoryCards.reduce((s, c) => s + c.count, 0),
    [categoryCards],
  );

  // ── Category filter toggle ─────────────────────────────────────────────
  // Clicking a card sets error_classification in filters (toggles off if already active).
  // effectiveFilters then propagates to useIncidents, useAnalyticsSummary, and
  // useAnalyticsTrends so KPIs, charts, and category counts all stay in sync.
  const handleCategoryClick = (cat) => {
    const key = cat.classificationKeys[0];
    setFilters((prev) => ({
      ...prev,
      error_classification: prev.error_classification === key ? '' : key,
    }));
  };

  // Severity pie data
  const severityPieData = useMemo(
    () =>
      (summary?.severity || []).map((row) => ({
        name:  row?.key || t('incidents.status.unknown'),
        value: Number(row?.count) || 0,
      })),
    [summary?.severity, t],
  );

  // ── Principles strip data (resolved through i18n) ──────────────────────
  const principles = [
    {
      icon:  '🔒',
      title: t('incidents.public_reports.principles.confidentiality_title'),
      desc:  t('incidents.public_reports.principles.confidentiality_desc'),
    },
    {
      icon:  '⚡',
      title: t('incidents.public_reports.principles.fast_response_title'),
      desc:  t('incidents.public_reports.principles.fast_response_desc'),
    },
    {
      icon:  '📊',
      title: t('incidents.public_reports.principles.actionable_data_title'),
      desc:  t('incidents.public_reports.principles.actionable_data_desc'),
    },
  ];

  // ── Loading / error ────────────────────────────────────────────────────
  const initialLoading     = summaryLoading || trendsLoading || incidentsLoading;
  const backgroundFetching = (summaryFetching && !summaryLoading) || (trendsFetching && !trendsLoading);
  const error              = summaryError || trendsError || incidentsError;

  if (initialLoading) {
    return (
      <div style={{ minHeight: 220, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <Spinner />
      </div>
    );
  }

  if (error) {
    return (
      <div
        style={{
          border:          '1px solid #FECACA',
          backgroundColor: '#FEF2F2',
          borderRadius:    12,
          padding:         14,
          color:           '#991B1B',
          fontSize:        14,
          fontWeight:      600,
        }}
      >
        {t('analytics.error_loading')}
      </div>
    );
  }

  // ── Render ─────────────────────────────────────────────────────────────
  return (
    <section style={{ display: 'grid', gap: 0, direction: isRTL ? 'rtl' : 'ltr' }}>

      {/* ── Filter bar ──────────────────────────────────────────────────── */}
      <div style={{ marginBottom: 16 }}>
        <DashboardFilterBar
          filters={effectiveFilters}
          onFiltersChange={setFilters}
          isLoading={backgroundFetching}
          lockedFacilityName={lockedFacilityName}
        />
      </div>

      {/* ── Navy hero header ────────────────────────────────────────────── */}
      <div
        style={{
          background:   C.navy,
          borderRadius: 16,
          padding:      '36px 28px 32px',
          marginBottom: 16,
          position:     'relative',
          overflow:     'hidden',
        }}
      >
        <div
          aria-hidden
          style={{
            position:      'absolute',
            top:           -80,
            right:         -80,
            width:         320,
            height:        320,
            borderRadius:  '50%',
            background:    'radial-gradient(circle, rgba(11,125,107,0.22) 0%, transparent 70%)',
            pointerEvents: 'none',
          }}
        />

        <div
          style={{
            display:      'inline-flex',
            alignItems:   'center',
            gap:          8,
            padding:      '4px 13px',
            borderRadius: 999,
            background:   'rgba(11,125,107,0.22)',
            border:       '1px solid rgba(11,125,107,0.45)',
            marginBottom: 14,
          }}
        >
          <span style={{ fontSize: 11, fontWeight: 700, color: '#7FDDCA', letterSpacing: '0.04em' }}>
            {t('common.page_titles.incident_reports')}
          </span>
        </div>

        <h1
          style={{
            margin:        '0 0 10px',
            fontSize:      'clamp(22px, 3vw, 32px)',
            fontWeight:    900,
            color:         C.white,
            letterSpacing: '-0.025em',
            fontFamily:    '"Georgia", serif',
            lineHeight:    1.2,
          }}
        >
          {t('incidents.public_reports.page_heading')}
        </h1>

        <p style={{ margin: '0 0 24px', fontSize: 13, color: 'rgba(255,255,255,0.55)', lineHeight: 1.7 }}>
        </p>

        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
          <HeroKPI label={t('analytics.kpi.total_incidents')} value={totalIncidents} />
          <HeroKPI label={t('analytics.kpi.open')}             value={openIncidents}  accent="#FCD34D" />
          <HeroKPI label={t('analytics.kpi.high_risk_major')}  value={highRisk}       accent="#FCA5A5" />
        </div>
      </div>

      {/* ── Category breakdown ──────────────────────────────────────────── */}
      <div style={{ marginBottom: 20 }}>
        <SectionTitle>
          {t('incidents.public_reports.category_breakdown_title')}
        </SectionTitle>

        {effectiveFilters.error_classification && (
          <div
            style={{
              display:        'inline-flex',
              alignItems:     'center',
              gap:            8,
              marginBottom:   10,
              padding:        '5px 12px',
              borderRadius:   999,
              background:     C.tealLight,
              border:         `1px solid ${C.teal}55`,
              fontSize:       12,
              color:          C.teal,
              fontWeight:     700,
              cursor:         'pointer',
            }}
            onClick={() => setFilters((prev) => ({ ...prev, error_classification: '' }))}
          >
            <span>🔍 {effectiveFilters.error_classification}</span>
            <span style={{ fontWeight: 900, fontSize: 14, lineHeight: 1 }}>×</span>
          </div>
        )}

        <div
          style={{
            display:             'grid',
            gridTemplateColumns: 'repeat(7, minmax(0, 1fr))',
            gap:                 12,
          }}
        >
          {categoryCards.map((cat) => (
            <CategoryCard
              key={cat.labelKey}
              icon={cat.icon}
              label={cat.label}
              count={cat.count}
              total={totalByCategory}
              isSelected={effectiveFilters.error_classification === cat.classificationKeys[0]}
              filteredLabel={t('incidents.public_reports.filtered_badge')}
              onClick={() => handleCategoryClick(cat)}
            />
          ))}
        </div>

        <p style={{ marginTop: 10, fontSize: 11, color: C.g400, fontStyle: 'italic' }}>
          {t('incidents.public_reports.data_note')}
        </p>
      </div>

      {/* ── Principles strip ────────────────────────────────────────────── */}
      <div
        style={{
          background:   C.tealLight,
          borderRadius: 14,
          padding:      '28px 24px',
          border:       `1px solid ${C.teal}30`,
          marginBottom: 20,
        }}
      >
        <div
          style={{
            display:             'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
            gap:                 20,
            textAlign:           'center',
          }}
        >
          {principles.map((p) => (
            <div key={p.title}>
              <div style={{ fontSize: 24, marginBottom: 6 }}>{p.icon}</div>
              <div style={{ fontSize: 13, fontWeight: 700, color: C.navy, marginBottom: 3 }}>{p.title}</div>
              <div style={{ fontSize: 12, color: C.g600 }}>{p.desc}</div>
            </div>
          ))}
        </div>
      </div>

      {/* ── Charts row ───────────────────────────────────────────────────── */}
      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 14 }}>

        <section
          style={{
            border:          `1px solid ${C.g200}`,
            borderRadius:    14,
            backgroundColor: C.white,
            padding:         16,
          }}
        >
          <SectionTitle>{t('analytics.charts.monthly_trends')}</SectionTitle>
          <TrendChart data={trends || []} />
        </section>

        <section
          style={{
            border:          `1px solid ${C.g200}`,
            borderRadius:    14,
            backgroundColor: C.white,
            padding:         16,
          }}
        >
          <SectionTitle>{t('analytics.charts.severity_breakdown')}</SectionTitle>
          <div style={{ width: '100%', height: 260 }}>
            <ResponsiveContainer>
              <PieChart>
                <Pie
                  data={severityPieData}
                  dataKey="value"
                  nameKey="name"
                  innerRadius={50}
                  outerRadius={84}
                  paddingAngle={2}
                >
                  {severityPieData.map((entry, index) => (
                    <Cell key={entry.name} fill={PIE_COLORS[index % PIE_COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip formatter={(value) => [value, t('analytics.tooltip_incidents')]} />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </section>
      </div>

    </section>
  );
}