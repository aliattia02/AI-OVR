// frontend/src/components/analytics/AnalyticsDashboard.jsx
// CompareView now owns its own data-fetching, loading state, and error handling,
// so this file no longer imports useAnalyticsCompare or the recharts primitives
// (Bar, BarChart, CartesianGrid, XAxis, YAxis) that were only used in that section.

import { useMemo } from 'react';
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
import TrendChart from './TrendChart';

const PIE_COLORS = ['#0B7D6B', '#1B6CA8', '#D97706', '#6D28D9', '#EF4444', '#9CA3AF'];

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

function Card({ title, value }) {
  return (
    <div
      style={{
        backgroundColor: '#FFFFFF',
        border: '1px solid #E5E7EB',
        borderRadius: 12,
        padding: 14,
        display: 'grid',
        gap: 6,
      }}
    >
      <div style={{ fontSize: 12, color: '#6B7280', fontWeight: 600 }}>{title}</div>
      <div style={{ fontSize: 24, color: '#111827', fontWeight: 800 }}>{value}</div>
    </div>
  );
}

export default function AnalyticsDashboard() {
  const { tier } = useAuth();
  const { data: summary, isLoading: summaryLoading, error: summaryError } = useAnalyticsSummary();
  const { data: trends, isLoading: trendsLoading, error: trendsError } = useAnalyticsTrends();

  // CompareView fetches its own data — no compare query here.

  const statusCounts = useMemo(() => toMap(summary?.status), [summary?.status]);
  const severityData = useMemo(
    () =>
      (summary?.severity || []).map((row) => ({
        name: row?.key || 'Unknown',
        value: Number(row?.count) || 0,
      })),
    [summary?.severity]
  );

  const totalIncidents = useMemo(() => sumCounts(summary?.status), [summary?.status]);
  const openIncidents = Math.max(0, totalIncidents - (statusCounts.Completed || 0));

  // high_risk: derived from severity array — Major incidents are the high-risk cohort.
  // The backend /analytics/summary response only returns status/severity/event_type
  // arrays and does not include high_risk or pending_ai_review fields directly.
  const highRisk = useMemo(
    () => (summary?.severity || []).find((r) => r?.key === 'Major')?.count ?? 0,
    [summary?.severity]
  );

  // pending_ai_review: incidents that are still open (not yet Completed).
  // A reasonable proxy until the backend exposes a dedicated field.
  const pendingAIReview = useMemo(
    () =>
      (summary?.status || [])
        .filter((r) => r?.key !== 'Completed')
        .reduce((sum, r) => sum + (Number(r?.count) || 0), 0),
    [summary?.status]
  );

  // Summary + trends gate the full-page spinner; compare is handled inside CompareView.
  const loading = summaryLoading || trendsLoading;
  const error = summaryError || trendsError;

  if (loading) {
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

  return (
    <div style={{ display: 'grid', gap: 12 }}>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, minmax(0, 1fr))', gap: 10 }}>
        <Card title="Total Incidents" value={totalIncidents} />
        <Card title="Open" value={openIncidents} />
        <Card title="High Risk" value={highRisk} />
        <Card title="Pending AI Review" value={pendingAIReview} />
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 12 }}>
        <section style={{ border: '1px solid #E5E7EB', borderRadius: 12, backgroundColor: '#FFFFFF', padding: 14 }}>
          <div style={{ fontSize: 15, fontWeight: 700, color: '#111827', marginBottom: 10 }}>Monthly Trends</div>
          <TrendChart data={trends || []} />
        </section>

        <section style={{ border: '1px solid #E5E7EB', borderRadius: 12, backgroundColor: '#FFFFFF', padding: 14 }}>
          <div style={{ fontSize: 15, fontWeight: 700, color: '#111827', marginBottom: 10 }}>Severity Breakdown</div>
          <div style={{ width: '100%', height: 280 }}>
            <ResponsiveContainer>
              <PieChart>
                <Pie data={severityData} dataKey="value" nameKey="name" innerRadius={52} outerRadius={86} paddingAngle={2}>
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

      {/* Facility / Governorate comparison — restricted to tier ≥ 4.
          CompareView handles its own loading skeleton, 403 message, and empty state. */}
      {tier >= 4 && (
        <section style={{ border: '1px solid #E5E7EB', borderRadius: 12, backgroundColor: '#FFFFFF', padding: 14 }}>
          <div style={{ fontSize: 15, fontWeight: 700, color: '#111827', marginBottom: 10 }}>
            Comparison
          </div>
          <CompareView />
        </section>
      )}
    </div>
  );
}