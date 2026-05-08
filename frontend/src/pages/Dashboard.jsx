import AnalyticsDashboard from '../components/analytics/AnalyticsDashboard';
import { useAuth } from '../context/AuthContext';

// Analytics endpoints require tier ≥ 3.  Staff (tier 1-2) must not trigger
// those requests or they receive a 403 on every render.
const ANALYTICS_MIN_TIER = 2;

function StaffWelcome() {
  return (
    <div
      style={{
        border: '1px solid #E5E7EB',
        borderRadius: 12,
        backgroundColor: '#FFFFFF',
        padding: 24,
        color: '#374151',
        fontSize: 15,
        lineHeight: 1.6,
      }}
    >
      <div style={{ fontSize: 18, fontWeight: 700, color: '#111827', marginBottom: 8 }}>
        Welcome to E·OVR
      </div>
      <p style={{ margin: 0 }}>
        Use the sidebar to submit a new incident report or review existing reports assigned to your
        facility. Analytics are available to managers and above.
      </p>
    </div>
  );
}

export default function Dashboard() {
  const { tier } = useAuth();

  return (
    <section style={{ display: 'grid', gap: 12 }}>
      <h1 style={{ margin: 0, color: '#111827' }}>Dashboard</h1>
      {tier >= ANALYTICS_MIN_TIER ? <AnalyticsDashboard /> : <StaffWelcome />}
    </section>
  );
}