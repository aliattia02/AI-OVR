import { useMemo } from 'react';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { useAuth } from '../../context/AuthContext';
import { useAnalyticsCompare, useAnalyticsSummary, useAnalyticsTrends } from '../../hooks/useAnalytics';
import Spinner from '../shared/Spinner';
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
  const {
    data: compare,
    isLoading: compareLoading,
    error: compareError,
  } = useAnalyticsCompare('facility', { enabled: tier >= 4 });

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
  const highRisk = Number(summary?.high_risk ?? summary?.highRisk ?? 0) || 0;
  const pendingAIReview = Number(summary?.pending_ai_review ?? summary?.pendingAIReview ?? 0) || 0;

  const loading = summaryLoading || trendsLoading || (tier >= 4 && compareLoading);
  const error = summaryError || trendsError || (tier >= 4 ? compareError : null);

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

      {tier >= 4 && (
        <section style={{ border: '1px solid #E5E7EB', borderRadius: 12, backgroundColor: '#FFFFFF', padding: 14 }}>
          <div style={{ fontSize: 15, fontWeight: 700, color: '#111827', marginBottom: 10 }}>Facility Comparison</div>
          <div style={{ width: '100%', height: 320 }}>
            <ResponsiveContainer>
              <BarChart data={compare || []} margin={{ top: 8, right: 12, left: 0, bottom: 24 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
                <XAxis dataKey="label" tick={{ fontSize: 11, fill: '#4B5563' }} angle={-20} textAnchor="end" interval={0} />
                <YAxis allowDecimals={false} tick={{ fontSize: 11, fill: '#4B5563' }} />
                <Tooltip formatter={(value) => [value, 'Incidents']} />
                <Bar dataKey="count" fill="#1B6CA8" radius={[8, 8, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </section>
      )}
    </div>
  );
}
