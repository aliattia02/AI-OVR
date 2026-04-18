import { INCIDENT_STATUSES } from '../../utils/enums';
import { formatEnumLabel } from '../../utils/formatters';

export default function StatusBadge({ status }) {
  const statusMeta = INCIDENT_STATUSES[status];
  const label = statusMeta?.label ?? formatEnumLabel(status) || 'Unknown';

  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        fontSize: 11,
        padding: '3px 9px',
        borderRadius: 999,
        fontWeight: 600,
        color: statusMeta?.color ?? '#1F2937',
        backgroundColor: statusMeta?.bg ?? '#F3F4F6',
      }}
    >
      {label}
    </span>
  );
}
