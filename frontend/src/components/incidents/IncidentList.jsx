import { useMemo, useState } from 'react';
import { useIncidents } from '../../hooks/useIncidents';
import { INCIDENT_STATUSES, SEVERITY_OPTIONS } from '../../utils/enums';
import EmptyState from '../shared/EmptyState';
import IncidentCard from './IncidentCard';

const PAGE_SIZE = 20;

function IncidentSkeletonCard() {
  return (
    <div
      aria-hidden="true"
      style={{
        border: '1px solid #E5E7EB',
        borderRadius: 12,
        padding: 14,
        backgroundColor: '#FFFFFF',
        display: 'grid',
        gap: 10,
      }}
    >
      <div style={{ height: 14, width: '60%', borderRadius: 6, backgroundColor: '#E5E7EB' }} />
      <div style={{ height: 12, width: '35%', borderRadius: 6, backgroundColor: '#F3F4F6' }} />
      <div style={{ height: 36, width: '100%', borderRadius: 6, backgroundColor: '#F3F4F6' }} />
      <div style={{ height: 16, width: '50%', borderRadius: 999, backgroundColor: '#E5E7EB' }} />
      <div style={{ height: 12, width: '42%', borderRadius: 6, backgroundColor: '#F3F4F6' }} />
    </div>
  );
}

export default function IncidentList({ onIncidentClick, role }) {
  const [page, setPage] = useState(0);
  const [query, setQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [severityFilter, setSeverityFilter] = useState('all');

  const { data, isLoading, error, refetch } = useIncidents({ page, pageSize: PAGE_SIZE });

  // Raw server results — used to determine whether a next page exists.
  const rawResults = Array.isArray(data) ? data : [];
  const hasNextPage = rawResults.length >= PAGE_SIZE;

  const filteredIncidents = useMemo(() => {
    return rawResults.filter((incident) => {
      const matchesQuery =
        query.trim().length === 0 || incident?.description?.toLowerCase().includes(query.trim().toLowerCase());
      const matchesStatus = statusFilter === 'all' || incident?.status === statusFilter;
      const matchesSeverity = severityFilter === 'all' || incident?.severity === severityFilter;
      return matchesQuery && matchesStatus && matchesSeverity;
    });
  }, [rawResults, query, statusFilter, severityFilter]);

  // Reset to page 0 whenever any filter changes.
  function handleQueryChange(event) {
    setQuery(event.target.value);
    setPage(0);
  }
  function handleStatusChange(event) {
    setStatusFilter(event.target.value);
    setPage(0);
  }
  function handleSeverityChange(event) {
    setSeverityFilter(event.target.value);
    setPage(0);
  }

  if (error) {
    return (
      <div
        style={{
          border: '1px solid #FECACA',
          backgroundColor: '#FEF2F2',
          borderRadius: 12,
          padding: 16,
          display: 'grid',
          gap: 10,
        }}
      >
        <div style={{ color: '#991B1B', fontWeight: 700 }}>Failed to load incidents.</div>
        <div style={{ color: '#7F1D1D', fontSize: 13 }}>
          {error?.message || 'Please try again.'}
        </div>
        <div>
          <button
            type="button"
            onClick={() => refetch?.()}
            style={{
              border: 'none',
              borderRadius: 8,
              backgroundColor: '#0B7D6B',
              color: '#FFFFFF',
              padding: '8px 12px',
              fontSize: 13,
              fontWeight: 600,
              cursor: 'pointer',
            }}
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div style={{ display: 'grid', gap: 14 }}>
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
          gap: 10,
        }}
      >
        <input
          type="search"
          value={query}
          onChange={handleQueryChange}
          placeholder="Search description"
          style={{
            width: '100%',
            border: '1px solid #D1D5DB',
            borderRadius: 8,
            padding: '10px 12px',
            fontSize: 14,
            color: '#111827',
          }}
        />

        <select
          value={statusFilter}
          onChange={handleStatusChange}
          style={{
            width: '100%',
            border: '1px solid #D1D5DB',
            borderRadius: 8,
            padding: '10px 12px',
            fontSize: 14,
            color: '#111827',
            backgroundColor: '#FFFFFF',
          }}
        >
          <option value="all">All statuses</option>
          {Object.entries(INCIDENT_STATUSES).map(([statusKey, meta]) => (
            <option key={statusKey} value={statusKey}>
              {meta?.label || statusKey}
            </option>
          ))}
        </select>

        <select
          value={severityFilter}
          onChange={handleSeverityChange}
          style={{
            width: '100%',
            border: '1px solid #D1D5DB',
            borderRadius: 8,
            padding: '10px 12px',
            fontSize: 14,
            color: '#111827',
            backgroundColor: '#FFFFFF',
          }}
        >
          <option value="all">All severities</option>
          {SEVERITY_OPTIONS.map((severity) => (
            <option key={severity} value={severity}>
              {severity}
            </option>
          ))}
        </select>
      </div>

      <div style={{ fontSize: 13, color: '#374151', fontWeight: 600 }}>
        Showing {filteredIncidents.length} incidents
      </div>

      {isLoading ? (
        <div style={{ display: 'grid', gap: 10, gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))' }}>
          {Array.from({ length: 6 }).map((_, index) => (
            <IncidentSkeletonCard key={index} />
          ))}
        </div>
      ) : filteredIncidents.length === 0 ? (
        <EmptyState
          icon="🗂️"
          title="No incidents found"
          subtitle="Try changing your search or filter criteria."
        />
      ) : (
        <div style={{ display: 'grid', gap: 10, gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))' }}>
          {filteredIncidents.map((incident, index) => (
            <IncidentCard
              key={incident?.incident_id || incident?.id || `incident-${index}`}
              incident={incident}
              onClick={onIncidentClick}
              role={role}
            />
          ))}
        </div>
      )}

      {/* Pagination bar — hidden while loading */}
      {!isLoading && (
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 12,
            paddingTop: 4,
          }}
        >
          <button
            type="button"
            onClick={() => setPage((p) => Math.max(0, p - 1))}
            disabled={page === 0}
            style={{
              border: '1px solid #D1D5DB',
              borderRadius: 8,
              backgroundColor: page === 0 ? '#F9FAFB' : '#FFFFFF',
              color: page === 0 ? '#9CA3AF' : '#111827',
              padding: '7px 14px',
              fontSize: 13,
              fontWeight: 600,
              cursor: page === 0 ? 'not-allowed' : 'pointer',
            }}
          >
            ← Previous
          </button>

          <span style={{ fontSize: 13, color: '#374151', fontWeight: 600 }}>
            Page {page + 1}
          </span>

          <button
            type="button"
            onClick={() => setPage((p) => p + 1)}
            disabled={!hasNextPage}
            style={{
              border: '1px solid #D1D5DB',
              borderRadius: 8,
              backgroundColor: !hasNextPage ? '#F9FAFB' : '#FFFFFF',
              color: !hasNextPage ? '#9CA3AF' : '#111827',
              padding: '7px 14px',
              fontSize: 13,
              fontWeight: 600,
              cursor: !hasNextPage ? 'not-allowed' : 'pointer',
            }}
          >
            Next →
          </button>
        </div>
      )}
    </div>
  );
}