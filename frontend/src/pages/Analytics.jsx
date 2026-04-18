import AnalyticsDashboard from '../components/analytics/AnalyticsDashboard';
import EmptyState from '../components/shared/EmptyState';
import { useAuth } from '../context/AuthContext';

export default function Analytics() {
  const { tier } = useAuth();

  return (
    <section style={{ display: 'grid', gap: 12 }}>
      <h1 style={{ margin: 0, color: '#111827' }}>Analytics</h1>
      {tier < 3 ? <EmptyState title="Analytics not available for your role." /> : <AnalyticsDashboard />}
    </section>
  );
}
