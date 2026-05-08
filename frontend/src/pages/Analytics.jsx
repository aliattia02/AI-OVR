import AnalyticsDashboard from '../components/analytics/AnalyticsDashboard';
import EmptyState from '../components/shared/EmptyState';
import { useAuth } from '../context/AuthContext';

const ANALYTICS_MIN_TIER = 2;

export default function Analytics() {
  const { tier } = useAuth();

  return (
    <section style={{ display: 'grid', gap: 12 }}>
      <h1 style={{ margin: 0, color: '#111827' }}>Analytics</h1>
      {tier < ANALYTICS_MIN_TIER ? <EmptyState title="Analytics not available for your role." /> : <AnalyticsDashboard />}
    </section>
  );
}