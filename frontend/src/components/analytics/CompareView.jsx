// frontend/src/components/analytics/CompareView.jsx
// Horizontal bar chart comparing incident counts across a chosen dimension.
// Owns its own data-fetching so AnalyticsDashboard no longer needs useAnalyticsCompare.

import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { useAnalyticsCompare } from '../../hooks/useAnalytics';
import EmptyState from '../shared/EmptyState';
import { useDirection } from '../../hooks/useDirection'; // RTL

// API supports these two dimensions (GET /analytics/compare?dimension=...)
const DIMENSION_KEYS = ['facility', 'governorate'];

const BAR_COLOR = '#1B6CA8';
const TRUNCATE_AT = 30;

function truncate(str) {
  if (!str) return '';
  return str.length > TRUNCATE_AT ? `${str.slice(0, TRUNCATE_AT)}\u2026` : str;
}

// Skeleton mimics horizontal bar rows to reduce layout shift on load
function LoadingSkeleton() {
  const widths = [88, 74, 61, 48, 33, 19];
  return (
    <div style={{ padding: '4px 0' }}>
      {widths.map((w, i) => (
        <div
          key={i}
          style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}
        >
          <div
            style={{
              flexShrink: 0,
              width: 140,
              height: 13,
              borderRadius: 4,
              backgroundColor: '#E5E7EB',
            }}
          />
          <div
            style={{
              width: `${w}%`,
              height: 22,
              borderRadius: 6,
              backgroundColor: '#E5E7EB',
            }}
          />
        </div>
      ))}
    </div>
  );
}

export default function CompareView({ filters = {} }) {
  const [dimension, setDimension] = useState('facility');
  const { isRTL } = useDirection(); // RTL
  const { t } = useTranslation();

  const { data, isLoading, error } = useAnalyticsCompare(dimension, filters);

  // Sort descending by count; truncate long labels before passing to Recharts
  const chartData = useMemo(
    () =>
      [...(data || [])]
        .sort((a, b) => (Number(b.count) || 0) - (Number(a.count) || 0))
        .map((row) => ({ ...row, label: truncate(row.label) })),
    [data]
  );

  const is403 = error?.response?.status === 403;
  // Give each row 46 px; floor at 200 so the chart is never too short
  const chartHeight = Math.max(chartData.length * 46, 200);

  const dimensions = useMemo(
    () => [
      { value: DIMENSION_KEYS[0], label: t('common.fields.facility') },
      { value: DIMENSION_KEYS[1], label: t('common.fields.governorate') },
    ],
    [t],
  );

  return (
    <div>
      {/* Dimension toggle */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
        {dimensions.map((d) => {
          const active = dimension === d.value;
          return (
            <button
              key={d.value}
              onClick={() => setDimension(d.value)}
              style={{
                padding: '5px 16px',
                borderRadius: 20,
                border: `1.5px solid ${active ? '#1B6CA8' : '#D1D5DB'}`,
                backgroundColor: active ? '#EFF6FF' : '#FFFFFF',
                color: active ? '#1B6CA8' : '#4B5563',
                fontSize: 13,
                fontWeight: active ? 700 : 400,
                cursor: 'pointer',
                transition: 'border-color 0.15s, background-color 0.15s',
              }}
            >
              {d.label}
            </button>
          );
        })}
      </div>

      {/* Content area */}
      {isLoading ? (
        <LoadingSkeleton />
      ) : is403 ? (
        <div
          style={{
            padding: '14px 16px',
            borderRadius: 10,
            backgroundColor: '#FEF2F2',
            border: '1px solid #FECACA',
            color: '#991B1B',
            fontSize: 14,
            fontWeight: 600,
          }}
        >
          {t('analytics.compare.no_permission')}
        </div>
      ) : !chartData.length ? (
        <EmptyState message={t('analytics.compare.no_data')} />
      ) : (
        // RTL: keep Recharts rendering LTR so axes/ticks stay correct.
        <div className={isRTL ? 'recharts-rtl-fix' : undefined} style={{ width: '100%', height: chartHeight }}>
          <ResponsiveContainer>
            <BarChart
              data={chartData}
              layout="vertical"
              margin={{ top: 4, right: 24, left: 8, bottom: 4 }}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" horizontal={false} />
              <XAxis
                type="number"
                allowDecimals={false}
                tick={{ fontSize: 11, fill: '#4B5563' }}
              />
              <YAxis
                type="category"
                dataKey="label"
                width={170}
                tick={{ fontSize: 11, fill: '#374151' }}
              />
              <Tooltip formatter={(value) => [value, t('analytics.tooltip_incidents')]} />
              <Bar
                dataKey="count"
                fill={BAR_COLOR}
                radius={[0, 6, 6, 0]}
                barSize={24}
              />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
}
