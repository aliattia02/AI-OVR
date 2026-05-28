import { INCIDENT_STATUSES } from '../../utils/enums';
import { formatEnumLabel } from '../../utils/formatters';
import { useTranslation } from 'react-i18next';

export default function StatusBadge({ status }) {
  const { t } = useTranslation();
  const statusMeta = INCIDENT_STATUSES[status];
  const label = statusMeta?.label || formatEnumLabel(status) || t('incidents.status.unknown');

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
