import AnalyticsDashboard from '../components/analytics/AnalyticsDashboard';

export default function Dashboard() {
  return (
    <section style={{ display: 'grid', gap: 12 }}>
      <h1 style={{ margin: 0, color: '#111827' }}>Dashboard</h1>
      <AnalyticsDashboard />
    </section>
  );
}
