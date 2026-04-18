import { useParams } from 'react-router-dom';
import PatientReportForm from '../components/patient/PatientReportForm';

export default function PatientReport() {
  const { facility_uuid: facilityUuidLegacy, uuid } = useParams();
  const facilityUuid = facilityUuidLegacy || uuid;

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
