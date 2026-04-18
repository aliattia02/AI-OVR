import { useNavigate } from 'react-router-dom';
import IncidentList from '../components/incidents/IncidentList';
import { useAuth } from '../context/AuthContext';

export default function Reports() {
  const navigate = useNavigate();
  const { role } = useAuth();

  return (
    <section style={{ display: 'grid', gap: 12 }}>
      <h1 style={{ margin: 0, color: '#111827' }}>Incident Reports</h1>
      <IncidentList
        role={role}
        onIncidentClick={(incident) => {
          const id = incident?.incident_id || incident?.id;
          if (id) navigate(`/incidents/${id}`);
        }}
      />
    </section>
  );
}
