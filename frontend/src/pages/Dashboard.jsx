import IncidentReportsPage from '../pages/IncidentReportsPage';
import NewIncidentForm from '../components/incidents/NewIncidentForm';
import { useAuth } from '../context/AuthContext';

// Staff role lands on the new incident form.
// All other roles (quality_admin and above) see the analytics dashboard.
const STAFF_ROLES = ['staff'];

export default function Dashboard() {
  const { role } = useAuth();

  return (
    <section style={{ display: 'grid', gap: 12 }}>
      <h1 style={{ margin: 0, color: '#111827' }}>Dashboard</h1>
      {STAFF_ROLES.includes(role) ? <NewIncidentForm /> : <IncidentReportsPage />}
    </section>
  );
}