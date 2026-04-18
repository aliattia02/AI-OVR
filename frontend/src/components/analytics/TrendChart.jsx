import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';

const TEAL = '#0B7D6B';

function buildMonthlyWindow(rawPoints = []) {
  const map = new Map((rawPoints || []).map((point) => [point.month, Number(point.count) || 0]));
  const now = new Date();
  const data = [];

  for (let offset = 11; offset >= 0; offset -= 1) {
    const d = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - offset, 1));
    const month = `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}`;
    data.push({ month, count: map.get(month) || 0 });
  }

  return data;
}

export default function TrendChart({ data = [] }) {
  const chartData = buildMonthlyWindow(data);

  return (
    <div style={{ width: '100%', height: 280 }}>
      <ResponsiveContainer>
        <LineChart data={chartData} margin={{ top: 8, right: 12, left: 0, bottom: 8 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
          <XAxis dataKey="month" tick={{ fontSize: 11, fill: '#4B5563' }} />
          <YAxis allowDecimals={false} tick={{ fontSize: 11, fill: '#4B5563' }} />
          <Tooltip
            formatter={(value) => [value, 'Incidents']}
            contentStyle={{ borderRadius: 10, border: '1px solid #E5E7EB' }}
            labelStyle={{ fontWeight: 600 }}
          />
          <Line
            type="monotone"
            dataKey="count"
            stroke={TEAL}
            strokeWidth={3}
            dot={{ r: 3, fill: TEAL, strokeWidth: 0 }}
            activeDot={{ r: 5 }}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
