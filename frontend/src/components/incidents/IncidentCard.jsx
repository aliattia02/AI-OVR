import { useState } from 'react';
import StatusBadge from './StatusBadge';
import { formatDate, formatEnumLabel } from '../../utils/formatters';

export default function IncidentCard({ incident, onClick, role }) {
  const [hovered, setHovered] = useState(false);

  const handleClick = () => {
    onClick?.(incident);
  };

  const showAIPending =
    incident?.ai_metadata?.auto_classification !== null &&
    incident?.ai_metadata?.auto_classification !== undefined &&
    incident?.ai_metadata?.human_reviewed === false;

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={handleClick}
      onKeyDown={(event) => {
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault();
          handleClick();
        }
      }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        border: '1px solid #E5E7EB',
        borderRadius: 12,
        padding: 14,
        backgroundColor: '#FFFFFF',
        cursor: 'pointer',
        boxShadow: hovered ? '0 6px 18px rgba(17,24,39,0.10)' : '0 1px 3px rgba(17,24,39,0.05)',
        transform: hovered ? 'translateY(-1px)' : 'translateY(0)',
        transition: 'box-shadow 0.18s ease, transform 0.18s ease',
        display: 'grid',
        gap: 10,
      }}
      aria-label={`Incident ${incident?.incident_id ?? ''} ${role ?? ''}`.trim()}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10 }}>
        <div style={{ minWidth: 0 }}>
          <div style={{ fontSize: 14, fontWeight: 700, color: '#111827' }}>{incident?.facility_name || 'Unknown Facility'}</div>
          <div style={{ fontSize: 12, color: '#4B5563' }}>{incident?.governorate || ''}</div>
        </div>

        <div
          style={{
            fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace',
            fontSize: 11,
            color: '#6B7280',
            whiteSpace: 'nowrap',
          }}
        >
          {incident?.incident_id || ''}
        </div>
      </div>

      <div
        style={{
          fontSize: 13,
          color: '#1F2937',
          display: '-webkit-box',
          WebkitLineClamp: 2,
          WebkitBoxOrient: 'vertical',
          overflow: 'hidden',
          lineHeight: 1.4,
          minHeight: '2.8em',
        }}
      >
        {incident?.description || ''}
      </div>

      <div style={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: 8 }}>
        <StatusBadge status={incident?.status} />
        <span style={{ fontSize: 12, color: '#374151', fontWeight: 600 }}>
          Severity: {incident?.severity ? formatEnumLabel(incident.severity) : '—'}
        </span>
      </div>

      <div style={{ fontSize: 12, color: '#4B5563' }}>Registered: {formatDate(incident?.registration_date) || '—'}</div>

      {showAIPending && (
        <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, width: 'fit-content' }}>
          <span
            style={{
              width: 8,
              height: 8,
              borderRadius: '50%',
              backgroundColor: '#0B7D6B',
              display: 'inline-block',
            }}
          />
          <span style={{ fontSize: 11, fontWeight: 600, color: '#0B7D6B' }}>AI Pending Review</span>
        </div>
      )}
    </div>
  );
}
