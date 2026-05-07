/**
 * frontend/src/components/incidents/IncidentList.jsx
 *
 * Table-based incident list with:
 *   - Up to 1 000 records per page (configurable via PAGE_SIZE_OPTIONS)
 *   - Inline quick-search bar
 *   - Expandable Advanced Search panel with all filter dimensions
 *   - Export: CSV (client-side, respects active filters) + XLSX (backend /exports/excel)
 *   - Sortable columns
 */

import { useCallback, useMemo, useRef, useState } from 'react';
import { useIncidents } from '../../hooks/useIncidents';
import { INCIDENT_STATUSES, SEVERITY_OPTIONS } from '../../utils/enums';
import EmptyState from '../shared/EmptyState';
import StatusBadge from './StatusBadge';

// ── Constants ─────────────────────────────────────────────────────────────────

const PAGE_SIZE_OPTIONS = [25, 50, 100, 250, 500, 1000];
const DEFAULT_PAGE_SIZE = 50;

// These mirror backend enums. Extend as new values are added to the backend.
const FACILITY_TYPE_OPTIONS = [
  'Hospital',
  'Primary Health Center',
  'Specialized Center',
  'Polyclinic',
  'Medical Complex',
  'Rehabilitation Center',
  'Other',
];

const ERROR_CLASSIFICATION_OPTIONS = [
  'MedicationError',
  'ClinicalManagement',
  'DiagnosisError',
  'PatientFall',
  'HospitalAcquiredInfection',
  'SurgicalProcedureError',
  'EquipmentFailure',
  'DocumentationError',
  'CommunicationError',
  'BloodTransfusionError',
  'WorkplaceViolence',
  'Environmental',
  'Other',
];

const EVENT_TYPE_OPTIONS = [
  'NearMiss',
  'AdverseEvent',
  'SentinelEvent',
  'NoHarm',
  'UnsafeCondition',
];

const INCIDENT_STATUS_OPTIONS = [
  'Created',
  'InProgress',
  'Evaluating',
  'MoreInfoNeeded',
  'ActionTaken',
  'Completed',
];

const SEVERITY_OPTS = ['Major', 'Moderate', 'Minor'];

// ── Palette & design tokens ────────────────────────────────────────────────────

const C = {
  brand:       '#0B7D6B',
  brandLight:  '#E6F4F1',
  brandHover:  '#096358',
  text:        '#111827',
  textMid:     '#374151',
  textMuted:   '#6B7280',
  border:      '#E5E7EB',
  borderFocus: '#0B7D6B',
  bg:          '#FFFFFF',
  bgAlt:       '#F9FAFB',
  bgStripe:    '#F3FAF8',
  danger:      '#EF4444',
  dangerBg:    '#FEF2F2',
  dangerBorder:'#FECACA',
  dangerText:  '#991B1B',
  yellow:      '#D97706',
  shadow:      '0 1px 3px rgba(0,0,0,0.08)',
  shadowMd:    '0 4px 12px rgba(0,0,0,0.10)',
};

// ── Utility helpers ────────────────────────────────────────────────────────────

function fmt(val) {
  if (val == null || val === '') return '—';
  return String(val);
}

function fmtDate(val) {
  if (!val) return '—';
  try {
    return new Date(val).toLocaleDateString('en-GB', {
      day: '2-digit', month: 'short', year: 'numeric',
    });
  } catch {
    return String(val);
  }
}

function riskColor(score) {
  if (score == null) return C.textMuted;
  if (score >= 7)  return '#DC2626';
  if (score >= 5)  return '#D97706';
  if (score >= 3)  return '#0B7D6B';
  return '#6B7280';
}

function riskLabel(score) {
  if (score == null) return '—';
  if (score >= 7)  return `${score} · Critical`;
  if (score >= 5)  return `${score} · High`;
  if (score >= 3)  return `${score} · Medium`;
  return `${score} · Low`;
}

// Export helpers ---------------------------------------------------------------

function escapeCSV(val) {
  const s = fmt(val);
  if (s.includes(',') || s.includes('"') || s.includes('\n')) {
    return `"${s.replace(/"/g, '""')}"`;
  }
  return s;
}

const CSV_COLUMNS = [
  { key: 'incident_id',          label: 'Incident ID' },
  { key: 'status',               label: 'Status' },
  { key: 'severity',             label: 'Severity' },
  { key: 'error_classification', label: 'Classification' },
  { key: 'event_type',           label: 'Event Type' },
  { key: 'facility_name',        label: 'Facility' },
  { key: 'facility_type',        label: 'Facility Type' },
  { key: 'governorate',          label: 'Governorate' },
  { key: 'administration',       label: 'Administration' },
  { key: 'involved_person',      label: 'Person Involved' },
  { key: 'reporter_role',        label: 'Reporter Role' },
  { key: 'occurrence_date',      label: 'Occurrence Date' },
  { key: 'registration_date',    label: 'Creation Date' },
  { key: 'risk_score',           label: 'Risk Score' },
  { key: 'description',          label: 'Description' },
];

function downloadCSV(rows) {
  const header = CSV_COLUMNS.map(c => c.label).join(',');
  const body = rows.map(r =>
    CSV_COLUMNS.map(c => escapeCSV(r[c.key])).join(',')
  ).join('\n');
  const blob = new Blob([`\uFEFF${header}\n${body}`], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `incidents_${new Date().toISOString().slice(0, 10)}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

// ── Sub-components ─────────────────────────────────────────────────────────────

function Skeleton() {
  return (
    <tr style={{ borderBottom: `1px solid ${C.border}` }}>
      {Array.from({ length: 10 }).map((_, i) => (
        <td key={i} style={{ padding: '12px 14px' }}>
          <div style={{
            height: 12, borderRadius: 6,
            backgroundColor: i % 3 === 0 ? '#E5E7EB' : '#F3F4F6',
            width: i === 0 ? 90 : i === 1 ? '70%' : '50%',
          }} />
        </td>
      ))}
    </tr>
  );
}

function FilterInput({ label, value, onChange, type = 'text', placeholder = '' }) {
  return (
    <label style={{ display: 'grid', gap: 4 }}>
      <span style={{ fontSize: 11, fontWeight: 700, color: C.textMuted, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
        {label}
      </span>
      <input
        type={type}
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder={placeholder}
        style={{
          border: `1px solid ${C.border}`,
          borderRadius: 7,
          padding: '8px 10px',
          fontSize: 13,
          color: C.text,
          backgroundColor: C.bg,
          outline: 'none',
          transition: 'border-color 0.15s',
        }}
        onFocus={e => { e.target.style.borderColor = C.borderFocus; }}
        onBlur={e => { e.target.style.borderColor = C.border; }}
      />
    </label>
  );
}

function FilterSelect({ label, value, onChange, options }) {
  return (
    <label style={{ display: 'grid', gap: 4 }}>
      <span style={{ fontSize: 11, fontWeight: 700, color: C.textMuted, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
        {label}
      </span>
      <select
        value={value}
        onChange={e => onChange(e.target.value)}
        style={{
          border: `1px solid ${C.border}`,
          borderRadius: 7,
          padding: '8px 10px',
          fontSize: 13,
          color: value === 'all' ? C.textMuted : C.text,
          backgroundColor: C.bg,
          outline: 'none',
          cursor: 'pointer',
          appearance: 'none',
          backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='8' fill='none'%3E%3Cpath d='M1 1l5 5 5-5' stroke='%236B7280' stroke-width='1.5' stroke-linecap='round'/%3E%3C/svg%3E")`,
          backgroundRepeat: 'no-repeat',
          backgroundPosition: 'right 10px center',
          paddingRight: 28,
        }}
      >
        <option value="all">All</option>
        {options.map(opt => (
          <option key={opt.value || opt} value={opt.value || opt}>
            {opt.label || opt}
          </option>
        ))}
      </select>
    </label>
  );
}

function DateRangeFilter({ label, from, to, onFromChange, onToChange }) {
  return (
    <div style={{ display: 'grid', gap: 4 }}>
      <span style={{ fontSize: 11, fontWeight: 700, color: C.textMuted, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
        {label}
      </span>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6 }}>
        <input
          type="date"
          value={from}
          onChange={e => onFromChange(e.target.value)}
          style={{ border: `1px solid ${C.border}`, borderRadius: 7, padding: '8px 10px', fontSize: 12, color: C.text, backgroundColor: C.bg, outline: 'none' }}
          onFocus={e => { e.target.style.borderColor = C.borderFocus; }}
          onBlur={e => { e.target.style.borderColor = C.border; }}
        />
        <input
          type="date"
          value={to}
          onChange={e => onToChange(e.target.value)}
          style={{ border: `1px solid ${C.border}`, borderRadius: 7, padding: '8px 10px', fontSize: 12, color: C.text, backgroundColor: C.bg, outline: 'none' }}
          onFocus={e => { e.target.style.borderColor = C.borderFocus; }}
          onBlur={e => { e.target.style.borderColor = C.border; }}
        />
      </div>
      <div style={{ display: 'flex', gap: 8, fontSize: 10, color: C.textMuted, paddingTop: 1 }}>
        <span>From</span><span style={{ marginLeft: 'auto' }}>To</span>
      </div>
    </div>
  );
}

function ColHeader({ label, sortKey, sortBy, sortDir, onSort }) {
  const active = sortBy === sortKey;
  return (
    <th
      onClick={() => onSort(sortKey)}
      style={{
        padding: '10px 14px',
        textAlign: 'left',
        fontSize: 11,
        fontWeight: 700,
        textTransform: 'uppercase',
        letterSpacing: '0.06em',
        color: active ? C.brand : C.textMuted,
        whiteSpace: 'nowrap',
        cursor: 'pointer',
        userSelect: 'none',
        borderBottom: `2px solid ${active ? C.brand : C.border}`,
        backgroundColor: C.bg,
        position: 'sticky',
        top: 0,
        zIndex: 1,
      }}
    >
      {label}
      {active && (
        <span style={{ marginLeft: 4, opacity: 0.8 }}>
          {sortDir === 'asc' ? '↑' : '↓'}
        </span>
      )}
    </th>
  );
}

// ── Main component ─────────────────────────────────────────────────────────────

const EMPTY_FILTERS = {
  query:              '',
  governorate:        'all',
  facilityType:       'all',
  facilityName:       '',
  status:             'all',
  involvedPerson:     '',
  errorClassification:'all',
  eventType:          'all',
  severity:           'all',
  creationFrom:       '',
  creationTo:         '',
  occurrenceFrom:     '',
  occurrenceTo:       '',
};

function activeFilterCount(filters) {
  return Object.entries(filters).filter(([k, v]) => {
    if (k === 'query') return false; // quick search handled separately
    return v !== 'all' && v !== '';
  }).length;
}

export default function IncidentList({ onIncidentClick, role }) {
  // ── Server-side pagination state
  const [page,     setPage]     = useState(0);
  const [pageSize, setPageSize] = useState(DEFAULT_PAGE_SIZE);

  // ── Filter & search state
  const [filters,      setFilters]      = useState(EMPTY_FILTERS);
  const [advOpen,      setAdvOpen]      = useState(false);
  const [sortBy,       setSortBy]       = useState('registration_date');
  const [sortDir,      setSortDir]      = useState('desc');
  const [exporting,    setExporting]    = useState(null); // 'csv' | 'xlsx' | null

  const advRef = useRef(null);

  // Fetch up to pageSize records from server
  const { data, isLoading, error, refetch } = useIncidents({ page, pageSize });

  const rawResults = Array.isArray(data) ? data : [];
  const hasNextPage = rawResults.length >= pageSize;

  // ── Collect dynamic dropdown options from current data ─────────────────────
  const governorateOptions = useMemo(() => {
    const vals = [...new Set(rawResults.map(r => r.governorate).filter(Boolean))].sort();
    return vals;
  }, [rawResults]);

  // ── Client-side filtering ──────────────────────────────────────────────────
  const filteredIncidents = useMemo(() => {
    const q    = filters.query.trim().toLowerCase();
    const cFr  = filters.creationFrom  ? new Date(filters.creationFrom)  : null;
    const cTo  = filters.creationTo    ? new Date(filters.creationTo + 'T23:59:59') : null;
    const oFr  = filters.occurrenceFrom ? new Date(filters.occurrenceFrom) : null;
    const oTo  = filters.occurrenceTo  ? new Date(filters.occurrenceTo + 'T23:59:59') : null;

    return rawResults.filter(inc => {
      // Quick search — description, incident_id, involved person
      if (q) {
        const haystack = [inc.description, inc.incident_id, inc.involved_person, inc.facility_name]
          .map(v => String(v || '').toLowerCase()).join(' ');
        if (!haystack.includes(q)) return false;
      }
      if (filters.governorate !== 'all' && inc.governorate !== filters.governorate) return false;
      if (filters.facilityType !== 'all' && inc.facility_type !== filters.facilityType) return false;
      if (filters.facilityName.trim() && !String(inc.facility_name || '').toLowerCase().includes(filters.facilityName.trim().toLowerCase())) return false;
      if (filters.status !== 'all' && inc.status !== filters.status) return false;
      if (filters.involvedPerson.trim() && !String(inc.involved_person || '').toLowerCase().includes(filters.involvedPerson.trim().toLowerCase())) return false;
      if (filters.errorClassification !== 'all' && inc.error_classification !== filters.errorClassification) return false;
      if (filters.eventType !== 'all' && inc.event_type !== filters.eventType) return false;
      if (filters.severity !== 'all' && inc.severity !== filters.severity) return false;
      // Date ranges
      if (cFr || cTo) {
        const d = inc.registration_date ? new Date(inc.registration_date) : null;
        if (!d) return false;
        if (cFr && d < cFr) return false;
        if (cTo && d > cTo) return false;
      }
      if (oFr || oTo) {
        const d = inc.occurrence_date ? new Date(inc.occurrence_date) : null;
        if (!d) return false;
        if (oFr && d < oFr) return false;
        if (oTo && d > oTo) return false;
      }
      return true;
    });
  }, [rawResults, filters]);

  // ── Sorting ────────────────────────────────────────────────────────────────
  const sortedIncidents = useMemo(() => {
    return [...filteredIncidents].sort((a, b) => {
      let av = a[sortBy], bv = b[sortBy];
      if (av == null) av = '';
      if (bv == null) bv = '';
      // Numeric sort for risk_score
      if (sortBy === 'risk_score') {
        av = Number(av) || 0;
        bv = Number(bv) || 0;
        return sortDir === 'asc' ? av - bv : bv - av;
      }
      // Date sort
      if (sortBy === 'registration_date' || sortBy === 'occurrence_date') {
        av = av ? new Date(av).getTime() : 0;
        bv = bv ? new Date(bv).getTime() : 0;
        return sortDir === 'asc' ? av - bv : bv - av;
      }
      av = String(av).toLowerCase();
      bv = String(bv).toLowerCase();
      if (av < bv) return sortDir === 'asc' ? -1 : 1;
      if (av > bv) return sortDir === 'asc' ? 1 : -1;
      return 0;
    });
  }, [filteredIncidents, sortBy, sortDir]);

  // ── Helpers ────────────────────────────────────────────────────────────────
  function setFilter(key, value) {
    setFilters(prev => ({ ...prev, [key]: value }));
    setPage(0);
  }

  function clearFilters() {
    setFilters(EMPTY_FILTERS);
    setPage(0);
  }

  function handleSort(key) {
    if (sortBy === key) {
      setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(key);
      setSortDir('asc');
    }
  }

  const handleExportCSV = useCallback(() => {
    setExporting('csv');
    try { downloadCSV(sortedIncidents); }
    finally { setTimeout(() => setExporting(null), 800); }
  }, [sortedIncidents]);

  const handleExportXLSX = useCallback(async () => {
    setExporting('xlsx');
    try {
      const res = await fetch('/api/exports/excel', {
        headers: { Authorization: `Bearer ${window.__ovr_token || ''}` },
      });
      if (!res.ok) throw new Error('Export failed');
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `incidents_${new Date().toISOString().slice(0, 10)}.xlsx`;
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      alert('XLSX export failed. Please try again.');
    } finally {
      setTimeout(() => setExporting(null), 800);
    }
  }, []);

  const advFilterCount = activeFilterCount(filters);

  // ── Error state ────────────────────────────────────────────────────────────
  if (error) {
    return (
      <div style={{ border: `1px solid ${C.dangerBorder}`, backgroundColor: C.dangerBg, borderRadius: 12, padding: 20, display: 'grid', gap: 10 }}>
        <div style={{ color: C.dangerText, fontWeight: 700 }}>Failed to load incidents.</div>
        <div style={{ color: '#7F1D1D', fontSize: 13 }}>{error?.message || 'Please try again.'}</div>
        <button type="button" onClick={() => refetch?.()} style={btnStyle(C.brand)}>Retry</button>
      </div>
    );
  }

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <div style={{ display: 'grid', gap: 12, fontFamily: "'DM Sans', system-ui, sans-serif" }}>

      {/* ── Top bar: Quick search + controls ─────────────────────────────── */}
      <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
        {/* Quick search */}
        <div style={{ position: 'relative', flex: '1 1 260px', minWidth: 220 }}>
          <span style={{ position: 'absolute', left: 11, top: '50%', transform: 'translateY(-50%)', color: C.textMuted, fontSize: 14, pointerEvents: 'none' }}>
            🔍
          </span>
          <input
            type="search"
            value={filters.query}
            onChange={e => setFilter('query', e.target.value)}
            placeholder="Search by ID, description, person, facility…"
            style={{ width: '100%', border: `1px solid ${C.border}`, borderRadius: 8, padding: '9px 12px 9px 34px', fontSize: 13, color: C.text, boxSizing: 'border-box', outline: 'none', backgroundColor: C.bg }}
            onFocus={e => { e.target.style.borderColor = C.brand; e.target.style.boxShadow = `0 0 0 3px ${C.brandLight}`; }}
            onBlur={e => { e.target.style.borderColor = C.border; e.target.style.boxShadow = 'none'; }}
          />
        </div>

        {/* Advanced Search toggle */}
        <button
          type="button"
          onClick={() => setAdvOpen(o => !o)}
          style={{
            ...btnStyle(advOpen ? C.brand : C.bg),
            border: `1px solid ${advOpen ? C.brand : C.border}`,
            color: advOpen ? '#fff' : C.textMid,
            display: 'flex', alignItems: 'center', gap: 6, position: 'relative',
          }}
        >
          <span style={{ fontSize: 13 }}>⚙</span>
          Advanced Search
          {advFilterCount > 0 && (
            <span style={{ backgroundColor: C.yellow, color: '#fff', borderRadius: 999, fontSize: 10, fontWeight: 800, padding: '1px 6px', lineHeight: 1.6 }}>
              {advFilterCount}
            </span>
          )}
          <span style={{ fontSize: 10, opacity: 0.7, marginLeft: 2 }}>{advOpen ? '▲' : '▼'}</span>
        </button>

        {advFilterCount > 0 && (
          <button type="button" onClick={clearFilters} style={{ ...btnStyle('#F3F4F6'), color: C.textMid, border: `1px solid ${C.border}`, fontSize: 12 }}>
            ✕ Clear filters
          </button>
        )}

        {/* Page size */}
        <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: C.textMuted, marginLeft: 'auto' }}>
          Rows:
          <select
            value={pageSize}
            onChange={e => { setPageSize(Number(e.target.value)); setPage(0); }}
            style={{ border: `1px solid ${C.border}`, borderRadius: 6, padding: '6px 8px', fontSize: 12, color: C.text, backgroundColor: C.bg, cursor: 'pointer' }}
          >
            {PAGE_SIZE_OPTIONS.map(n => <option key={n} value={n}>{n}</option>)}
          </select>
        </label>

        {/* Export buttons */}
        <button
          type="button"
          onClick={handleExportCSV}
          disabled={exporting === 'csv' || sortedIncidents.length === 0}
          style={{ ...btnStyle(C.bg), border: `1px solid ${C.border}`, color: C.textMid, display: 'flex', alignItems: 'center', gap: 5, fontSize: 12, opacity: sortedIncidents.length === 0 ? 0.4 : 1 }}
        >
          {exporting === 'csv' ? '⏳' : '⬇'} CSV
        </button>
        <button
          type="button"
          onClick={handleExportXLSX}
          disabled={exporting === 'xlsx'}
          style={{ ...btnStyle(C.brand), color: '#fff', display: 'flex', alignItems: 'center', gap: 5, fontSize: 12 }}
        >
          {exporting === 'xlsx' ? '⏳' : '⬇'} XLSX
        </button>
      </div>

      {/* ── Advanced Search Panel ─────────────────────────────────────────── */}
      <div
        ref={advRef}
        style={{
          overflow: 'hidden',
          maxHeight: advOpen ? 600 : 0,
          opacity: advOpen ? 1 : 0,
          transition: 'max-height 0.28s cubic-bezier(0.4,0,0.2,1), opacity 0.2s ease',
        }}
      >
        <div style={{
          border: `1px solid ${C.brand}`,
          borderRadius: 12,
          backgroundColor: C.brandLight,
          padding: '18px 20px',
          display: 'grid',
          gap: 14,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span style={{ fontSize: 13, fontWeight: 700, color: C.brand }}>Advanced Filters</span>
            {advFilterCount > 0 && (
              <button type="button" onClick={clearFilters} style={{ background: 'none', border: 'none', color: C.brand, fontSize: 12, cursor: 'pointer', fontWeight: 600 }}>
                Clear all
              </button>
            )}
          </div>

          {/* Row 1: Location */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: 12 }}>
            <FilterSelect
              label="Governorate"
              value={filters.governorate}
              onChange={v => setFilter('governorate', v)}
              options={governorateOptions}
            />
            <FilterSelect
              label="Facility Type"
              value={filters.facilityType}
              onChange={v => setFilter('facilityType', v)}
              options={FACILITY_TYPE_OPTIONS}
            />
            <FilterInput
              label="Facility Name"
              value={filters.facilityName}
              onChange={v => setFilter('facilityName', v)}
              placeholder="Type to search…"
            />
            <FilterInput
              label="Person Involved"
              value={filters.involvedPerson}
              onChange={v => setFilter('involvedPerson', v)}
              placeholder="Name or ID…"
            />
          </div>

          {/* Row 2: Classification */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: 12 }}>
            <FilterSelect
              label="Error Classification"
              value={filters.errorClassification}
              onChange={v => setFilter('errorClassification', v)}
              options={ERROR_CLASSIFICATION_OPTIONS}
            />
            <FilterSelect
              label="Event Type"
              value={filters.eventType}
              onChange={v => setFilter('eventType', v)}
              options={EVENT_TYPE_OPTIONS}
            />
            <FilterSelect
              label="Severity"
              value={filters.severity}
              onChange={v => setFilter('severity', v)}
              options={SEVERITY_OPTS}
            />
            <FilterSelect
              label="Incident Status"
              value={filters.status}
              onChange={v => setFilter('status', v)}
              options={INCIDENT_STATUS_OPTIONS}
            />
          </div>

          {/* Row 3: Date ranges */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: 12 }}>
            <DateRangeFilter
              label="Creation Date"
              from={filters.creationFrom}
              to={filters.creationTo}
              onFromChange={v => setFilter('creationFrom', v)}
              onToChange={v => setFilter('creationTo', v)}
            />
            <DateRangeFilter
              label="Occurrence Date"
              from={filters.occurrenceFrom}
              to={filters.occurrenceTo}
              onFromChange={v => setFilter('occurrenceFrom', v)}
              onToChange={v => setFilter('occurrenceTo', v)}
            />
          </div>
        </div>
      </div>

      {/* ── Results summary ────────────────────────────────────────────────── */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: 12, color: C.textMuted }}>
        <span>
          Showing <strong style={{ color: C.text }}>{sortedIncidents.length.toLocaleString()}</strong>
          {sortedIncidents.length !== rawResults.length && (
            <> of <strong style={{ color: C.text }}>{rawResults.length.toLocaleString()}</strong> loaded</>
          )}
          {' '}incidents
        </span>
        {isLoading && <span style={{ color: C.brand, fontWeight: 600 }}>Loading…</span>}
      </div>

      {/* ── Table ─────────────────────────────────────────────────────────── */}
      <div style={{
        border: `1px solid ${C.border}`,
        borderRadius: 12,
        overflow: 'hidden',
        boxShadow: C.shadow,
        backgroundColor: C.bg,
      }}>
        <div style={{ overflowX: 'auto', maxHeight: 640 }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
            <thead>
              <tr>
                <ColHeader label="Incident ID"     sortKey="incident_id"          sortBy={sortBy} sortDir={sortDir} onSort={handleSort} />
                <ColHeader label="Status"          sortKey="status"               sortBy={sortBy} sortDir={sortDir} onSort={handleSort} />
                <ColHeader label="Severity"        sortKey="severity"             sortBy={sortBy} sortDir={sortDir} onSort={handleSort} />
                <ColHeader label="Classification"  sortKey="error_classification" sortBy={sortBy} sortDir={sortDir} onSort={handleSort} />
                <ColHeader label="Event Type"      sortKey="event_type"           sortBy={sortBy} sortDir={sortDir} onSort={handleSort} />
                <ColHeader label="Facility"        sortKey="facility_name"        sortBy={sortBy} sortDir={sortDir} onSort={handleSort} />
                <ColHeader label="Governorate"     sortKey="governorate"          sortBy={sortBy} sortDir={sortDir} onSort={handleSort} />
                <ColHeader label="Risk"            sortKey="risk_score"           sortBy={sortBy} sortDir={sortDir} onSort={handleSort} />
                <ColHeader label="Occurrence"      sortKey="occurrence_date"      sortBy={sortBy} sortDir={sortDir} onSort={handleSort} />
                <ColHeader label="Created"         sortKey="registration_date"    sortBy={sortBy} sortDir={sortDir} onSort={handleSort} />
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                Array.from({ length: 8 }).map((_, i) => <Skeleton key={i} />)
              ) : sortedIncidents.length === 0 ? (
                <tr>
                  <td colSpan={10} style={{ padding: 48, textAlign: 'center' }}>
                    <EmptyState
                      icon="🗂️"
                      title="No incidents found"
                      subtitle="Try adjusting your search or filter criteria."
                    />
                  </td>
                </tr>
              ) : (
                sortedIncidents.map((inc, idx) => (
                  <IncidentRow
                    key={inc?.incident_id || inc?.id || `row-${idx}`}
                    incident={inc}
                    idx={idx}
                    onClick={onIncidentClick}
                    role={role}
                  />
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ── Pagination ────────────────────────────────────────────────────── */}
      {!isLoading && (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 12, paddingTop: 2 }}>
          <button
            type="button"
            onClick={() => setPage(p => Math.max(0, p - 1))}
            disabled={page === 0}
            style={paginationBtn(page === 0)}
          >
            ← Previous
          </button>
          <span style={{ fontSize: 12, color: C.textMid, fontWeight: 600 }}>
            Page {page + 1}
          </span>
          <button
            type="button"
            onClick={() => setPage(p => p + 1)}
            disabled={!hasNextPage}
            style={paginationBtn(!hasNextPage)}
          >
            Next →
          </button>
        </div>
      )}
    </div>
  );
}

// ── Row component ──────────────────────────────────────────────────────────────

function IncidentRow({ incident: inc, idx, onClick, role }) {
  const [hovered, setHovered] = useState(false);

  const rowBg = hovered
    ? C.brandLight
    : idx % 2 === 0 ? C.bg : C.bgAlt;

  const score = inc?.risk_score;

  return (
    <tr
      onClick={() => onClick?.(inc?.incident_id || inc?.id)}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        borderBottom: `1px solid ${C.border}`,
        backgroundColor: rowBg,
        cursor: 'pointer',
        transition: 'background-color 0.1s ease',
      }}
    >
      {/* Incident ID */}
      <td style={{ padding: '11px 14px', whiteSpace: 'nowrap' }}>
        <span style={{ fontFamily: 'monospace', fontSize: 12, fontWeight: 700, color: C.brand }}>
          {fmt(inc?.incident_id)}
        </span>
        {inc?.ai_metadata?.auto_classification && (
          <span style={{ display: 'block', fontSize: 10, color: C.textMuted, marginTop: 2 }}>AI ✓</span>
        )}
      </td>

      {/* Status */}
      <td style={{ padding: '11px 14px', whiteSpace: 'nowrap' }}>
        <StatusBadge status={inc?.status} />
      </td>

      {/* Severity */}
      <td style={{ padding: '11px 14px', whiteSpace: 'nowrap' }}>
        <SeverityPill severity={inc?.severity} />
      </td>

      {/* Classification */}
      <td style={{ padding: '11px 14px', maxWidth: 160 }}>
        <span style={{ fontSize: 12, color: C.textMid, display: 'block', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {fmt(inc?.error_classification)}
        </span>
      </td>

      {/* Event Type */}
      <td style={{ padding: '11px 14px', whiteSpace: 'nowrap' }}>
        <span style={{ fontSize: 12, color: C.textMid }}>{fmt(inc?.event_type)}</span>
      </td>

      {/* Facility */}
      <td style={{ padding: '11px 14px', maxWidth: 180 }}>
        <span style={{ fontSize: 12, color: C.text, fontWeight: 600, display: 'block', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {fmt(inc?.facility_name)}
        </span>
        <span style={{ fontSize: 11, color: C.textMuted }}>{fmt(inc?.facility_type)}</span>
      </td>

      {/* Governorate */}
      <td style={{ padding: '11px 14px', whiteSpace: 'nowrap' }}>
        <span style={{ fontSize: 12, color: C.textMid }}>{fmt(inc?.governorate)}</span>
      </td>

      {/* Risk */}
      <td style={{ padding: '11px 14px', whiteSpace: 'nowrap' }}>
        {score != null ? (
          <span style={{ fontSize: 12, fontWeight: 700, color: riskColor(score) }}>
            {riskLabel(score)}
          </span>
        ) : (
          <span style={{ fontSize: 12, color: C.textMuted }}>—</span>
        )}
      </td>

      {/* Occurrence date */}
      <td style={{ padding: '11px 14px', whiteSpace: 'nowrap' }}>
        <span style={{ fontSize: 12, color: C.textMid }}>{fmtDate(inc?.occurrence_date)}</span>
      </td>

      {/* Creation date */}
      <td style={{ padding: '11px 14px', whiteSpace: 'nowrap' }}>
        <span style={{ fontSize: 12, color: C.textMid }}>{fmtDate(inc?.registration_date)}</span>
      </td>
    </tr>
  );
}

// ── Severity pill ──────────────────────────────────────────────────────────────

const SEVERITY_STYLES = {
  Major:    { bg: '#FEF2F2', color: '#991B1B', border: '#FECACA' },
  Moderate: { bg: '#FFFBEB', color: '#92400E', border: '#FDE68A' },
  Minor:    { bg: '#F0FDF4', color: '#166534', border: '#BBF7D0' },
};

function SeverityPill({ severity }) {
  const s = SEVERITY_STYLES[severity] || { bg: '#F3F4F6', color: '#374151', border: '#E5E7EB' };
  return (
    <span style={{
      display: 'inline-block',
      padding: '2px 9px',
      borderRadius: 999,
      fontSize: 11,
      fontWeight: 700,
      backgroundColor: s.bg,
      color: s.color,
      border: `1px solid ${s.border}`,
    }}>
      {severity || '—'}
    </span>
  );
}

// ── Style helpers ──────────────────────────────────────────────────────────────

function btnStyle(bg) {
  return {
    border: 'none',
    borderRadius: 8,
    backgroundColor: bg,
    padding: '8px 14px',
    fontSize: 13,
    fontWeight: 600,
    cursor: 'pointer',
    whiteSpace: 'nowrap',
  };
}

function paginationBtn(disabled) {
  return {
    border: `1px solid ${disabled ? C.border : C.brand}`,
    borderRadius: 8,
    backgroundColor: disabled ? C.bgAlt : C.bg,
    color: disabled ? C.textMuted : C.brand,
    padding: '7px 16px',
    fontSize: 12,
    fontWeight: 600,
    cursor: disabled ? 'not-allowed' : 'pointer',
  };
}