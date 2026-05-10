// frontend/src/components/analytics/AnalyticsDashboard.jsx
//
// Changes from previous version:
//  - Owns `filters` state (EMPTY_FILTERS shape matches DashboardFilterBar).
//  - Renders DashboardFilterBar above the metric cards.
//  - Passes `filters` to useAnalyticsSummary and useAnalyticsTrends so React
//    Query re-fetches whenever any filter value changes.
//  - Passes `filters` as a prop to CompareView.
//
// ⚠️  CompareView also needs a small update — see useAnalytics.js for the
//     one-paragraph change required there.

import { useMemo, useState } from 'react';
import {
  Cell,
  Legend,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
} from 'recharts';
import { useAuth } from '../../context/AuthContext';
import { useAnalyticsSummary, useAnalyticsTrends } from '../../hooks/useAnalytics';
import Spinner from '../shared/Spinner';
import CompareView from './CompareView';
import DashboardFilterBar from './DashboardFilterBar';
import TrendChart from './TrendChart';
import { useDirection } from '../../hooks/useDirection'; // RTL

// ── Constants ─────────────────────────────────────────────────────────────────

const PIE_COLORS = ['#0B7D6B', '#1B6CA8', '#D97706', '#6D28D9', '#EF4444', '#9CA3AF'];

const EMPTY_FILTERS = {
  governorate:     '',
  administration:  '',
  facility_type:   '',
  facility_name:   '',
  creation_from:   '',
  creation_to:     '',
  occurrence_from: '',
  occurrence_to:   '',
};

// ── Helpers ───────────────────────────────────────────────────────────────────

function toMap(items = []) {
  return (items || []).reduce((acc, row) => {
    if (!row?.key) return acc;
    acc[row.key] = Number(row.count) || 0;
    return acc;
  }, {});
}

function sumCounts(items = []) {
  return (items || []).reduce((sum, row) => sum + (Number(row?.count) || 0), 0);
}

// ── Sub-components ────────────────────────────────────────────────────────────

function Card({ title, value, sub }) {
  return (
    <div
      style={{
        backgroundColor: '#FFFFFF',
        border: '1px solid #E5E7EB',
        borderRadius: 12,
        padding: 14,
        display: 'grid',
        gap: 4,
      }}
    >
      <div style={{ fontSize: 12, color: '#6B7280', fontWeight: 600 }}>{title}</div>
      <div style={{ fontSize: 26, color: '#111827', fontWeight: 800, lineHeight: 1.1 }}>{value}</div>
      {sub && <div style={{ fontSize: 11, color: '#9CA3AF' }}>{sub}</div>}
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────

export default function AnalyticsDashboard() {
  const { tier, user } = useAuth();
  const { isRTL } = useDirection(); // RTL

  // Tier-2 users are scoped to their own facility only.
  // Their facility_name is locked into every filter object sent to the backend.
  const isFacilityScoped = tier === 2;
  const lockedFacilityName = isFacilityScoped ? (user?.facility_name ?? '') : null;

  // ── Filter state ───────────────────────────────────────────────────────────
  // Lifted here so a single source of truth feeds the filter bar, all hooks,
  // and the CompareView (which fetches its own data).
  const [filters, setFilters] = useState(EMPTY_FILTERS);

  // For tier-2 users, always override facility_name with their own facility
  // before the filters reach the hooks or the filter bar.
  const effectiveFilters = useMemo(
    () => isFacilityScoped
      ? { ...filters, facility_name: lockedFacilityName }
      : filters,
    [filters, isFacilityScoped, lockedFacilityName],
  );

  // ── Data hooks — re-fetch whenever filters change ─────────────────────────
  const {
    data: summary,
    isLoading: summaryLoading,
    isFetching: summaryFetching,
    error: summaryError,
  } = useAnalyticsSummary(effectiveFilters);

  const {
    data: trends,
    isLoading: trendsLoading,
    isFetching: trendsFetching,
    error: trendsError,
  } = useAnalyticsTrends(effectiveFilters);

  // ── Derived metrics ────────────────────────────────────────────────────────

  const statusCounts = useMemo(() => toMap(summary?.status), [summary?.status]);

  const severityData = useMemo(
    () =>
      (summary?.severity || []).map((row) => ({
        name: row?.key || 'Unknown',
        value: Number(row?.count) || 0,
      })),
    [summary?.severity],
  );

  const totalIncidents = useMemo(() => sumCounts(summary?.status), [summary?.status]);
  const openIncidents  = Math.max(0, totalIncidents - (statusCounts.Completed || 0));

  // high_risk: Major incidents are the highest-severity cohort available from
  // the summary response.  The backend does not expose a dedicated field yet.
  const highRisk = useMemo(
    () => (summary?.severity || []).find((r) => r?.key === 'Major')?.count ?? 0,
    [summary?.severity],
  );

  // pending_ai_review: incidents not yet Completed are a reasonable proxy until
  // the backend exposes a dedicated ai_pending field.
  const pendingAIReview = useMemo(
    () =>
      (summary?.status || [])
        .filter((r) => r?.key !== 'Completed')
        .reduce((sum, r) => sum + (Number(r?.count) || 0), 0),
    [summary?.status],
  );

  // ── Loading / error gates ─────────────────────────────────────────────────
  // Only block the entire panel on the initial load; background re-fetches
  // (isFetching) are handled by the filter bar's subtle "Updating…" indicator.

  const initialLoading = summaryLoading || trendsLoading;
  const backgroundFetching = (summaryFetching && !summaryLoading) || (trendsFetching && !trendsLoading);
  const error = summaryError || trendsError;

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
          border: '1px solid #FECACA',
          backgroundColor: '#FEF2F2',
          borderRadius: 12,
          padding: 14,
          color: '#991B1B',
          fontSize: 14,
          fontWeight: 600,
        }}
      >
        Failed to load analytics data.
      </div>
    );
  }

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <div style={{ display: 'grid', gap: 12 }}>

      {/* ── Dashboard filter bar ─────────────────────────────────────────── */}
      <DashboardFilterBar
        filters={effectiveFilters}
        onFiltersChange={setFilters}
        isLoading={backgroundFetching}
        lockedFacilityName={lockedFacilityName}
      />

      {/* ── KPI cards ────────────────────────────────────────────────────── */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(4, minmax(0, 1fr))',
          gap: 10,
          direction: isRTL ? 'rtl' : 'ltr', // RTL
        }}
      >
        <Card title="Total Incidents"    value={totalIncidents} />
        <Card title="Open"               value={openIncidents} />
        <Card title="High Risk (Major)"  value={highRisk} />
        <Card title="Pending AI Review"  value={pendingAIReview} />
      </div>

      {/* ── Charts row ───────────────────────────────────────────────────── */}
      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 12 }}>

        {/* Trend line */}
        <section style={{
          border: '1px solid #E5E7EB',
          borderRadius: 12,
          backgroundColor: '#FFFFFF',
          padding: 14,
        }}>
          <div style={{ fontSize: 15, fontWeight: 700, color: '#111827', marginBottom: 10 }}>
            Monthly Trends
          </div>
          <TrendChart data={trends || []} />
        </section>

        {/* Severity pie */}
        <section style={{
          border: '1px solid #E5E7EB',
          borderRadius: 12,
          backgroundColor: '#FFFFFF',
          padding: 14,
        }}>
          <div style={{ fontSize: 15, fontWeight: 700, color: '#111827', marginBottom: 10 }}>
            Severity Breakdown
          </div>
          <div style={{ width: '100%', height: 280 }}>
            <ResponsiveContainer>
              <PieChart>
                <Pie
                  data={severityData}
                  dataKey="value"
                  nameKey="name"
                  innerRadius={52}
                  outerRadius={86}
                  paddingAngle={2}
                >
                  {severityData.map((entry, index) => (
                    <Cell key={entry.name} fill={PIE_COLORS[index % PIE_COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip formatter={(value) => [value, 'Incidents']} />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </section>
      </div>

      {/* ── Compare view — restricted to tier ≥ 4 ────────────────────────── */}
      {/* CompareView receives `filters` as a prop so its internal
          useAnalyticsCompare call re-fetches when dashboard filters change.
          See the one-paragraph note at the top of useAnalytics.js. */}
      {tier >= 4 && (
        <section style={{
          border: '1px solid #E5E7EB',
          borderRadius: 12,
          backgroundColor: '#FFFFFF',
          padding: 14,
        }}>
          <div style={{ fontSize: 15, fontWeight: 700, color: '#111827', marginBottom: 10 }}>
            Comparison
          </div>
          <CompareView filters={effectiveFilters} />
        </section>
      )}
    </div>
  );
}
