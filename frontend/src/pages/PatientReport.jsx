import { useParams } from 'react-router-dom';
import PatientReportForm from '../components/patient/PatientReportForm';

export default function PatientReport() {
  const { facility_uuid: facilityUuid } = useParams();

  return (
    <main
      style={{
        minHeight: '100vh',
        width: '100%',
        backgroundColor: '#FFFFFF',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 12,
      }}
    >
      <PatientReportForm facilityUuid={facilityUuid} />
    </main>
  );
}
