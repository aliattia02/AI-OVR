import { useEffect, useMemo, useState } from 'react';
import { fetchFacilitiesFull, provisionFacility, provisionTierUser } from '../services/admin';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';
import QRCodeView from '../components/patient/QRCodeView';

const styles = {
  page: {
    maxWidth: 600,
    margin: '40px auto',
    padding: '0 16px',
    color: 'var(--color-text-primary)',
  },
  title: {
    fontSize: 28,
    fontWeight: 700,
    marginBottom: 8,
  },
  note: {
    fontSize: 14,
    color: 'var(--color-text-secondary)',
    marginBottom: 24,
  },
  section: {
    border: '1px solid var(--color-border-primary)',
    background: 'var(--color-surface-primary)',
    borderRadius: 10,
    padding: 16,
    marginBottom: 18,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 700,
    marginBottom: 6,
  },
  sectionDesc: {
    fontSize: 14,
    color: 'var(--color-text-secondary)',
    marginBottom: 14,
  },
  row: {
    display: 'grid',
    gridTemplateColumns: '1fr',
    gap: 12,
    marginBottom: 12,
  },
  label: {
    display: 'block',
    fontSize: 13,
    fontWeight: 600,
    marginBottom: 6,
  },
  input: {
    width: '100%',
    border: '1px solid var(--color-border-primary)',
    borderRadius: 8,
    padding: '10px 12px',
    background: 'var(--color-surface-primary)',
    color: 'var(--color-text-primary)',
    boxSizing: 'border-box',
    fontSize: 14,
    fontFamily: 'inherit',
  },
  select: {
    width: '100%',
    border: '1px solid var(--color-border-primary)',
    borderRadius: 8,
    padding: '10px 12px',
    background: 'var(--color-surface-primary)',
    color: 'var(--color-text-primary)',
    boxSizing: 'border-box',
    cursor: 'pointer',
    fontSize: 14,
    fontFamily: 'inherit',
  },
  selectDisabled: {
    opacity: 0.45,
    cursor: 'not-allowed',
  },
  selectedFacility: {
    fontSize: 13,
    color: 'var(--color-text-secondary)',
    marginTop: 6,
    padding: '6px 10px',
    background: 'var(--color-background-secondary)',
    borderRadius: 6,
    border: '1px solid var(--color-border-secondary)',
  },
  button: {
    border: '1px solid var(--color-primary-border)',
    borderRadius: 8,
    padding: '10px 12px',
    fontWeight: 700,
    background: 'var(--color-primary)',
    color: 'var(--color-button-text)',
    cursor: 'pointer',
    fontSize: 14,
    fontFamily: 'inherit',
  },
  error: {
    background: 'var(--color-danger-background)',
    color: 'var(--color-danger-text)',
    border: '1px solid var(--color-danger-border)',
    borderRadius: 8,
    padding: 12,
    fontSize: 14,
    marginTop: 12,
  },
  loadingText: {
    fontSize: 13,
    color: 'var(--color-text-secondary)',
    marginBottom: 12,
  },
};

// ─── Shared helpers ──────────────────────────────────────────────────────────

function CopyButton({ text }) {
  const [copied, setCopied] = useState(false);
  const handle = () => {
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };
  return (
    <button
      onClick={handle}
      style={{
        marginLeft: 8,
        padding: '2px 10px',
        fontSize: 11,
        fontWeight: 600,
        borderRadius: 5,
        border: '1px solid var(--color-border-primary)',
        background: copied ? 'var(--color-primary)' : 'var(--color-surface-primary)',
        color: copied ? 'var(--color-button-text)' : 'var(--color-text-primary)',
        cursor: 'pointer',
        whiteSpace: 'nowrap',
        fontFamily: 'inherit',
      }}
    >
      {copied ? '✓ Copied' : 'Copy'}
    </button>
  );
}

function CredRow({ label, value, mono, password }) {
  const [show, setShow] = useState(false);
  const display = password && !show ? '••••••••••••' : value;
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '6px 0',
        borderBottom: '1px solid var(--color-border-secondary)',
      }}
    >
      <span style={{ fontSize: 12, color: 'var(--color-text-secondary)', minWidth: 110 }}>{label}</span>
      <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
        <span
          style={{
            fontFamily: mono || password ? 'monospace' : 'inherit',
            fontSize: 13,
            color: 'var(--color-text-primary)',
          }}
        >
          {display}
        </span>
        {password && (
          <button
            onClick={() => setShow((s) => !s)}
            style={{
              fontSize: 11,
              padding: '1px 6px',
              borderRadius: 4,
              border: '1px solid var(--color-border-primary)',
              background: 'transparent',
              cursor: 'pointer',
              color: 'var(--color-text-secondary)',
              fontFamily: 'inherit',
            }}
          >
            {show ? 'Hide' : 'Show'}
          </button>
        )}
        <CopyButton text={value} />
      </span>
    </div>
  );
}

function AccountCard({ title, data }) {
  if (!data) return null;
  const alreadySet = data.temp_password?.startsWith('(already');
  return (
    <div style={{ marginBottom: 14 }}>
      <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 6, color: 'var(--color-text-primary)' }}>
        {title}
      </div>
      <div
        style={{
          background: 'var(--color-background-secondary)',
          borderRadius: 8,
          padding: '4px 12px',
          border: '1px solid var(--color-border-secondary)',
        }}
      >
        <CredRow label="Username" value={data.username} mono />
        {data.email && <CredRow label="Email" value={data.email} />}
        <CredRow label="Temp password" value={data.temp_password} mono password={!alreadySet} />
      </div>
    </div>
  );
}

// ─── Facility provision result card ─────────────────────────────────────────

function ProvisionResultCard({ result }) {
  const patientLink = `${window.location.origin}/report/${result.patient_link_uuid}`;
  return (
    <div
      style={{
        marginTop: 14,
        border: '1px solid var(--color-border-secondary)',
        borderRadius: 10,
        overflow: 'hidden',
      }}
    >
      <div
        style={{
          background: 'var(--color-primary)',
          padding: '10px 16px',
          display: 'flex',
          alignItems: 'center',
          gap: 8,
        }}
      >
        <span style={{ fontSize: 16 }}>✓</span>
        <span style={{ fontWeight: 700, fontSize: 14, color: 'var(--color-button-text)' }}>
          Credentials provisioned
        </span>
      </div>
      <div style={{ padding: 16 }}>
        <div
          style={{
            marginBottom: 16,
            padding: 12,
            background: 'var(--color-background-secondary)',
            borderRadius: 8,
            border: '1px solid var(--color-border-secondary)',
          }}
        >
          <div
            style={{
              fontSize: 12,
              fontWeight: 700,
              color: 'var(--color-text-secondary)',
              marginBottom: 6,
              textTransform: 'uppercase',
              letterSpacing: '0.05em',
            }}
          >
            Patient submission link
          </div>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              flexWrap: 'wrap',
              gap: 8,
            }}
          >
            <a
              href={patientLink}
              target="_blank"
              rel="noopener noreferrer"
              style={{
                fontFamily: 'monospace',
                fontSize: 12,
                color: 'var(--color-primary)',
                wordBreak: 'break-all',
              }}
            >
              {patientLink}
            </a>
            <CopyButton text={patientLink} />
          </div>
        </div>
        {/* Task 7 — QR code for the patient submission link */}
        <div style={{ marginBottom: 16 }}>
          <div
            style={{
              fontSize: 12,
              fontWeight: 700,
              color: 'var(--color-text-secondary)',
              marginBottom: 8,
              textTransform: 'uppercase',
              letterSpacing: '0.05em',
            }}
          >
            Patient QR Code
          </div>
          <QRCodeView facilityUuid={result.patient_link_uuid} />
        </div>

        <AccountCard title="Staff reporter account" data={result.staff_reporter} />
        <AccountCard title="Quality admin account" data={result.quality_admin} />
        <div style={{ fontSize: 12, color: 'var(--color-text-secondary)', marginTop: 4, fontStyle: 'italic' }}>
          ⚠ {result.note}
        </div>
      </div>
    </div>
  );
}

// ─── Tier user provision result card ────────────────────────────────────────

const ROLE_LABELS = {
  governorate_manager: 'Governorate Manager',
  administration_manager: 'Administration Manager',
  top_management: 'Top Management',
  quality_admin: 'Quality Admin',
  staff: 'Staff',
};

function TierResultCard({ result }) {
  const alreadySet = result.temp_password?.startsWith('(already');
  return (
    <div
      style={{
        marginTop: 14,
        border: '1px solid var(--color-border-secondary)',
        borderRadius: 10,
        overflow: 'hidden',
      }}
    >
      <div
        style={{
          background: 'var(--color-primary)',
          padding: '10px 16px',
          display: 'flex',
          alignItems: 'center',
          gap: 8,
        }}
      >
        <span style={{ fontSize: 16 }}>✓</span>
        <span style={{ fontWeight: 700, fontSize: 14, color: 'var(--color-button-text)' }}>
          {ROLE_LABELS[result.role] ?? result.role} account created
        </span>
      </div>
      <div style={{ padding: 16 }}>
        <div
          style={{
            background: 'var(--color-background-secondary)',
            borderRadius: 8,
            padding: '4px 12px',
            border: '1px solid var(--color-border-secondary)',
            marginBottom: 10,
          }}
        >
          <CredRow label="Full name" value={result.full_name} />
          <CredRow label="Username" value={result.username} mono />
          {result.email && <CredRow label="Email" value={result.email} />}
          {result.governorate && <CredRow label="Governorate" value={result.governorate} />}
          {result.administration && <CredRow label="Administration" value={result.administration} />}
          <CredRow label="Temp password" value={result.temp_password} mono password={!alreadySet} />
        </div>
        <div style={{ fontSize: 12, color: 'var(--color-text-secondary)', fontStyle: 'italic' }}>
          ⚠ This password is shown once. Copy it before leaving this page.
        </div>
      </div>
    </div>
  );
}

// ─── Cascading Facility Selector ─────────────────────────────────────────────

function FacilitySelector({ facilities, onSelect }) {
  const [selectedGov, setSelectedGov] = useState('');
  const [selectedAdmin, setSelectedAdmin] = useState('');
  const [selectedFacilityId, setSelectedFacilityId] = useState('');

  const governorates = useMemo(
    () => [...new Set(facilities.map((f) => f.governorate))].sort(),
    [facilities]
  );

  const administrations = useMemo(() => {
    if (!selectedGov) return [];
    return [...new Set(
      facilities.filter((f) => f.governorate === selectedGov).map((f) => f.administration)
    )].sort();
  }, [facilities, selectedGov]);

  const units = useMemo(() => {
    if (!selectedAdmin) return [];
    return facilities
      .filter((f) => f.governorate === selectedGov && f.administration === selectedAdmin)
      .sort((a, b) => a.facility_name.localeCompare(b.facility_name));
  }, [facilities, selectedGov, selectedAdmin]);

  const handleGovChange = (e) => {
    setSelectedGov(e.target.value);
    setSelectedAdmin('');
    setSelectedFacilityId('');
    onSelect(null);
  };
  const handleAdminChange = (e) => {
    setSelectedAdmin(e.target.value);
    setSelectedFacilityId('');
    onSelect(null);
  };
  const handleFacilityChange = (e) => {
    const id = e.target.value;
    setSelectedFacilityId(id);
    const facility = facilities.find((f) => f.facility_id === id) ?? null;
    onSelect(facility);
  };

  const selectedFacility = facilities.find((f) => f.facility_id === selectedFacilityId);

  return (
    <>
      <div style={styles.row}>
        <label style={styles.label}>Governorate</label>
        <select value={selectedGov} onChange={handleGovChange} style={styles.select}>
          <option value="">— Select governorate —</option>
          {governorates.map((gov) => (
            <option key={gov} value={gov}>{gov}</option>
          ))}
        </select>
      </div>

      <div style={styles.row}>
        <label style={styles.label}>Administration</label>
        <select
          value={selectedAdmin}
          onChange={handleAdminChange}
          disabled={!selectedGov}
          style={{ ...styles.select, ...(!selectedGov ? styles.selectDisabled : {}) }}
        >
          <option value="">— Select administration —</option>
          {administrations.map((admin) => (
            <option key={admin} value={admin}>{admin}</option>
          ))}
        </select>
      </div>

      <div style={styles.row}>
        <label style={styles.label}>Facility / Unit</label>
        <select
          value={selectedFacilityId}
          onChange={handleFacilityChange}
          disabled={!selectedAdmin}
          style={{ ...styles.select, ...(!selectedAdmin ? styles.selectDisabled : {}) }}
        >
          <option value="">— Select facility —</option>
          {units.map((f) => (
            <option key={f.facility_id} value={f.facility_id}>{f.facility_name}</option>
          ))}
        </select>
      </div>

      {selectedFacility && (
        <div style={styles.selectedFacility}>
          ✓ <strong>{selectedFacility.facility_name}</strong> · {selectedFacility.administration} ·{' '}
          {selectedFacility.governorate}
          <br />
          <span style={{ fontFamily: 'monospace', fontSize: 12 }}>ID: {selectedFacility.facility_id}</span>
        </div>
      )}
    </>
  );
}

// ─── Cascading Gov / Admin Selector (for tier user form) ────────────────────

function GovAdminSelector({ facilities, role, governorate, administration, onChange }) {
  if (role === 'top_management') return null;

  const governorates = useMemo(
    () => [...new Set(facilities.map((f) => f.governorate))].sort(),
    [facilities]
  );

  const administrations = useMemo(() => {
    if (!governorate) return [];
    return [...new Set(
      facilities.filter((f) => f.governorate === governorate).map((f) => f.administration)
    )].sort();
  }, [facilities, governorate]);

  return (
    <>
      <div style={styles.row}>
        <label style={styles.label}>Governorate</label>
        <select
          value={governorate}
          onChange={(e) => onChange({ governorate: e.target.value, administration: '' })}
          style={styles.select}
        >
          <option value="">— Select governorate —</option>
          {governorates.map((gov) => (
            <option key={gov} value={gov}>{gov}</option>
          ))}
        </select>
      </div>

      {role === 'administration_manager' && (
        <div style={styles.row}>
          <label style={styles.label}>Administration</label>
          <select
            value={administration}
            onChange={(e) => onChange({ administration: e.target.value })}
            disabled={!governorate}
            style={{ ...styles.select, ...(!governorate ? styles.selectDisabled : {}) }}
          >
            <option value="">— Select administration —</option>
            {administrations.map((admin) => (
              <option key={admin} value={admin}>{admin}</option>
            ))}
          </select>
        </div>
      )}
    </>
  );
}

// ─── Users tab ───────────────────────────────────────────────────────────────

const ROLE_BADGE_COLORS = {
  top_management:       { bg: '#EDE9FE', text: '#5B21B6' },
  governorate_manager:  { bg: '#DBEAFE', text: '#1E40AF' },
  administration_manager: { bg: '#CFFAFE', text: '#0E7490' },
  quality_admin:        { bg: '#D1FAE5', text: '#065F46' },
  staff:                { bg: '#F3F4F6', text: '#374151' },
};

function RoleBadge({ role }) {
  const colors = ROLE_BADGE_COLORS[role] ?? { bg: '#F3F4F6', text: '#374151' };
  return (
    <span
      style={{
        display: 'inline-block',
        padding: '2px 8px',
        borderRadius: 99,
        fontSize: 11,
        fontWeight: 600,
        background: colors.bg,
        color: colors.text,
        whiteSpace: 'nowrap',
      }}
    >
      {ROLE_LABELS[role] ?? role}
    </span>
  );
}

function StatusDot({ active }) {
  return (
    <span style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
      <span
        style={{
          width: 7,
          height: 7,
          borderRadius: '50%',
          background: active ? '#10B981' : '#D1D5DB',
          display: 'inline-block',
          flexShrink: 0,
        }}
      />
      <span style={{ fontSize: 12, color: active ? '#065F46' : '#9CA3AF' }}>
        {active ? 'Active' : 'Inactive'}
      </span>
    </span>
  );
}

function UsersTab() {
  const { user } = useAuth();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [filterRole, setFilterRole] = useState('');
  const [filterStatus, setFilterStatus] = useState('');

  useEffect(() => {
    // Wait until AuthContext has confirmed the session and token is set.
    // Without this guard the request fires before setToken() is called,
    // lands unauthenticated, and gets a 401.
    if (!user) return;

    api
      .get('/users', { params: { limit: 200 } })
      .then(({ data }) => setUsers(data))
      .catch(() => setError('Failed to load users. Check your connection or permissions.'))
      .finally(() => setLoading(false));
  }, [user]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return users.filter((u) => {
      if (filterRole && u.role !== filterRole) return false;
      if (filterStatus === 'active' && !u.is_active) return false;
      if (filterStatus === 'inactive' && u.is_active) return false;
      if (!q) return true;
      return (
        (u.full_name ?? '').toLowerCase().includes(q) ||
        (u.email ?? '').toLowerCase().includes(q) ||
        (u.facility_name ?? '').toLowerCase().includes(q) ||
        (u.governorate ?? '').toLowerCase().includes(q)
      );
    });
  }, [users, search, filterRole, filterStatus]);

  if (loading) {
    return <p style={{ ...styles.loadingText, marginTop: 12 }}>Loading users…</p>;
  }

  if (error) {
    return <div style={{ ...styles.error, marginTop: 12 }}>{error}</div>;
  }

  return (
    <div>
      {/* ── Toolbar ── */}
      <div
        style={{
          display: 'flex',
          flexWrap: 'wrap',
          gap: 10,
          marginBottom: 16,
          alignItems: 'center',
        }}
      >
        <input
          type="search"
          placeholder="Search by name, email, facility…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          style={{
            ...styles.input,
            flex: '1 1 200px',
            marginBottom: 0,
            padding: '8px 12px',
          }}
        />
        <select
          value={filterRole}
          onChange={(e) => setFilterRole(e.target.value)}
          style={{ ...styles.select, flex: '0 1 190px', padding: '8px 12px' }}
        >
          <option value="">All roles</option>
          <option value="top_management">Top Management</option>
          <option value="governorate_manager">Governorate Manager</option>
          <option value="administration_manager">Administration Manager</option>
          <option value="quality_admin">Quality Admin</option>
          <option value="staff">Staff</option>
        </select>
        <select
          value={filterStatus}
          onChange={(e) => setFilterStatus(e.target.value)}
          style={{ ...styles.select, flex: '0 1 140px', padding: '8px 12px' }}
        >
          <option value="">All statuses</option>
          <option value="active">Active</option>
          <option value="inactive">Inactive</option>
        </select>
      </div>

      {/* ── Count ── */}
      <div style={{ fontSize: 13, color: 'var(--color-text-secondary)', marginBottom: 10 }}>
        {filtered.length} of {users.length} user{users.length !== 1 ? 's' : ''}
      </div>

      {/* ── List ── */}
      {filtered.length === 0 ? (
        <div
          style={{
            textAlign: 'center',
            padding: '40px 0',
            fontSize: 14,
            color: 'var(--color-text-secondary)',
          }}
        >
          No users match your filters.
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {filtered.map((u) => (
            <div
              key={u.user_id}
              style={{
                border: '1px solid var(--color-border-primary)',
                borderRadius: 10,
                background: 'var(--color-surface-primary)',
                padding: '12px 14px',
              }}
            >
              {/* Top row: name + status */}
              <div
                style={{
                  display: 'flex',
                  alignItems: 'flex-start',
                  justifyContent: 'space-between',
                  gap: 8,
                  marginBottom: 6,
                }}
              >
                <div>
                  <div style={{ fontWeight: 700, fontSize: 14, color: 'var(--color-text-primary)' }}>
                    {u.full_name || '—'}
                  </div>
                  <div
                    style={{
                      fontSize: 12,
                      color: 'var(--color-text-secondary)',
                      fontFamily: 'monospace',
                      marginTop: 1,
                    }}
                  >
                    {u.email || '—'}
                  </div>
                </div>
                <StatusDot active={u.is_active} />
              </div>

              {/* Meta row: role + tier + location */}
              <div
                style={{
                  display: 'flex',
                  flexWrap: 'wrap',
                  alignItems: 'center',
                  gap: 6,
                  marginTop: 4,
                }}
              >
                <RoleBadge role={u.role} />
                <span
                  style={{
                    fontSize: 11,
                    fontWeight: 600,
                    padding: '2px 7px',
                    borderRadius: 99,
                    background: 'var(--color-background-secondary)',
                    color: 'var(--color-text-secondary)',
                    border: '1px solid var(--color-border-secondary)',
                  }}
                >
                  Tier {u.tier}
                </span>
                {u.facility_name && (
                  <span style={{ fontSize: 12, color: 'var(--color-text-secondary)' }}>
                    · {u.facility_name}
                  </span>
                )}
                {u.administration && (
                  <span style={{ fontSize: 12, color: 'var(--color-text-secondary)' }}>
                    · {u.administration}
                  </span>
                )}
                {u.governorate && (
                  <span style={{ fontSize: 12, color: 'var(--color-text-secondary)' }}>
                    · {u.governorate}
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── QR Codes tab ────────────────────────────────────────────────────────────

function QRCodesTab({ facilities, facilitiesLoading, facilitiesError }) {
  const [search, setSearch] = useState('');
  const [expandedId, setExpandedId] = useState(null);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return facilities;
    return facilities.filter(
      (f) =>
        f.facility_name.toLowerCase().includes(q) ||
        f.administration.toLowerCase().includes(q) ||
        f.governorate.toLowerCase().includes(q),
    );
  }, [facilities, search]);

  if (facilitiesLoading) {
    return <p style={styles.loadingText}>Loading facilities…</p>;
  }

  if (facilitiesError) {
    return <div style={styles.error}>{facilitiesError}</div>;
  }

  return (
    <div>
      <p style={styles.note}>
        Click a facility to reveal its QR code and patient submission link. The QR code can be
        printed and posted at the facility for anonymous patient reporting.
      </p>

      <input
        type="search"
        placeholder="Search by facility, administration, or governorate…"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        style={{ ...styles.input, marginBottom: 16 }}
      />

      {filtered.length === 0 ? (
        <div
          style={{
            textAlign: 'center',
            padding: '40px 0',
            fontSize: 14,
            color: 'var(--color-text-secondary)',
          }}
        >
          No facilities match your search.
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {filtered.map((f) => {
            const isOpen = expandedId === f.facility_id;
            return (
              <div
                key={f.facility_id}
                style={{
                  border: '1px solid var(--color-border-primary)',
                  borderRadius: 10,
                  background: 'var(--color-surface-primary)',
                  overflow: 'hidden',
                }}
              >
                {/* Row header — clickable toggle */}
                <button
                  onClick={() => setExpandedId(isOpen ? null : f.facility_id)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    width: '100%',
                    padding: '12px 14px',
                    background: 'transparent',
                    border: 'none',
                    cursor: 'pointer',
                    textAlign: 'left',
                    fontFamily: 'inherit',
                    gap: 10,
                  }}
                >
                  <div>
                    <div style={{ fontWeight: 700, fontSize: 14, color: 'var(--color-text-primary)' }}>
                      {f.facility_name}
                    </div>
                    <div style={{ fontSize: 12, color: 'var(--color-text-secondary)', marginTop: 2 }}>
                      {f.administration} · {f.governorate}
                    </div>
                  </div>
                  <span
                    style={{
                      fontSize: 16,
                      color: 'var(--color-text-secondary)',
                      flexShrink: 0,
                      transform: isOpen ? 'rotate(180deg)' : 'none',
                      transition: 'transform 0.15s',
                    }}
                  >
                    ▾
                  </span>
                </button>

                {/* Expanded QR panel */}
                {isOpen && (
                  <div
                    style={{
                      borderTop: '1px solid var(--color-border-secondary)',
                      padding: '16px 14px',
                      background: 'var(--color-background-secondary)',
                    }}
                  >
                    <QRCodeView facilityUuid={f.patient_link_uuid} />
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ─── Tab bar ─────────────────────────────────────────────────────────────────

function TabBar({ active, onChange }) {
  const tabs = [
    { id: 'provision', label: 'Provisioning' },
    { id: 'users',     label: 'Users' },
    { id: 'qr-codes',  label: 'QR Codes' },
  ];
  return (
    <div
      style={{
        display: 'flex',
        gap: 4,
        marginBottom: 24,
        borderBottom: '2px solid var(--color-border-primary)',
        paddingBottom: 0,
      }}
    >
      {tabs.map((tab) => {
        const isActive = tab.id === active;
        return (
          <button
            key={tab.id}
            onClick={() => onChange(tab.id)}
            style={{
              padding: '8px 18px',
              fontSize: 14,
              fontWeight: isActive ? 700 : 500,
              background: 'transparent',
              border: 'none',
              borderBottom: isActive
                ? '2px solid var(--color-primary)'
                : '2px solid transparent',
              marginBottom: '-2px',
              color: isActive ? 'var(--color-primary)' : 'var(--color-text-secondary)',
              cursor: 'pointer',
              fontFamily: 'inherit',
              transition: 'color 0.15s',
            }}
          >
            {tab.label}
          </button>
        );
      })}
    </div>
  );
}

// ─── Page ────────────────────────────────────────────────────────────────────

export default function AdminProvision() {
  const [activeTab, setActiveTab] = useState('provision');

  // Shared facility data — loaded once, consumed by both provisioning sections
  const [facilities, setFacilities] = useState([]);
  const [facilitiesLoading, setFacilitiesLoading] = useState(true);
  const [facilitiesError, setFacilitiesError] = useState('');

  useEffect(() => {
    fetchFacilitiesFull()
      .then(setFacilities)
      .catch(() =>
        setFacilitiesError('Failed to load facility data. Check your connection or permissions.')
      )
      .finally(() => setFacilitiesLoading(false));
  }, []);

  // ── Facility provision ───────────────────────────────────────────────────
  const [selectedFacility, setSelectedFacility] = useState(null);
  const [facilityResult, setFacilityResult] = useState(null);
  const [facilityError, setFacilityError] = useState('');
  const [facilityLoading, setFacilityLoading] = useState(false);

  const onFacilitySubmit = async (e) => {
    e.preventDefault();
    if (!selectedFacility) return;
    setFacilityError('');
    setFacilityResult(null);
    setFacilityLoading(true);
    try {
      const result = await provisionFacility(selectedFacility.facility_id);
      setFacilityResult(result);
    } catch (err) {
      setFacilityError(err?.response?.data?.detail || 'Failed to provision facility credentials.');
    } finally {
      setFacilityLoading(false);
    }
  };

  // ── Tier user provision ──────────────────────────────────────────────────
  const [form, setForm] = useState({
    username: '',
    full_name: '',
    role: 'governorate_manager',
    governorate: '',
    administration: '',
    email: '',
  });
  const [tierResult, setTierResult] = useState(null);
  const [tierError, setTierError] = useState('');
  const [tierLoading, setTierLoading] = useState(false);

  const handleRoleChange = (newRole) => {
    setForm((prev) => ({ ...prev, role: newRole, governorate: '', administration: '' }));
    setTierResult(null);
    setTierError('');
  };

  const isTopManagement = form.role === 'top_management';

  const tierDisabled =
    tierLoading ||
    !form.full_name.trim() ||
    !form.username.trim() ||
    !form.role ||
    (!isTopManagement && !form.governorate.trim()) ||
    (form.role === 'administration_manager' && !form.administration.trim());

  const onTierSubmit = async (e) => {
    e.preventDefault();
    setTierError('');
    setTierResult(null);
    setTierLoading(true);
    try {
      const payload = {
        username: form.username.trim(),
        full_name: form.full_name.trim(),
        role: form.role,
      };
      if (form.email.trim()) payload.email = form.email.trim();
      if (!isTopManagement && form.governorate.trim()) payload.governorate = form.governorate.trim();
      if (form.role === 'administration_manager' && form.administration.trim()) {
        payload.administration = form.administration.trim();
      }
      const result = await provisionTierUser(payload);
      setTierResult(result);
    } catch (err) {
      setTierError(err?.response?.data?.detail || 'Failed to create higher-tier user.');
    } finally {
      setTierLoading(false);
    }
  };

  // ── Render ───────────────────────────────────────────────────────────────
  return (
    <div style={styles.page}>
      <h1 style={styles.title}>User provisioning</h1>
      <p style={styles.note}>
        Top management only. Temporary passwords are shown once — copy them immediately.
      </p>

      <TabBar active={activeTab} onChange={setActiveTab} />

      {/* ── Users tab ──────────────────────────────────────────────────── */}
      {activeTab === 'users' && <UsersTab />}

      {/* ── QR Codes tab ───────────────────────────────────────────────── */}
      {activeTab === 'qr-codes' && (
        <QRCodesTab
          facilities={facilities}
          facilitiesLoading={facilitiesLoading}
          facilitiesError={facilitiesError}
        />
      )}

      {/* ── Provisioning tab ───────────────────────────────────────────── */}
      {activeTab === 'provision' && (
        <>
          {facilitiesError && <div style={styles.error}>{facilitiesError}</div>}

          {/* Facility provision */}
          <section style={styles.section}>
            <h2 style={styles.sectionTitle}>Provision facility credentials</h2>
            <p style={styles.sectionDesc}>
              Creates a staff reporter and quality admin account. Select the facility by location.
            </p>
            {facilitiesLoading ? (
              <p style={styles.loadingText}>Loading facilities…</p>
            ) : (
              <form onSubmit={onFacilitySubmit}>
                <FacilitySelector facilities={facilities} onSelect={setSelectedFacility} />
                <button
                  type="submit"
                  style={{ ...styles.button, marginTop: 4 }}
                  disabled={facilityLoading || !selectedFacility}
                >
                  {facilityLoading ? 'Provisioning…' : 'Provision credentials'}
                </button>
              </form>
            )}
            {facilityError && <div style={styles.error}>{facilityError}</div>}
            {facilityResult && <ProvisionResultCard result={facilityResult} />}
          </section>

          {/* Tier user provision */}
          <section style={styles.section}>
            <h2 style={styles.sectionTitle}>Create governorate / administration user</h2>
            <p style={styles.sectionDesc}>
              Creates a higher-tier account. Temporary password is shown once.
            </p>

            <form onSubmit={onTierSubmit}>
              <div style={styles.row}>
                <label htmlFor="full-name" style={styles.label}>Full name</label>
                <input
                  id="full-name"
                  type="text"
                  value={form.full_name}
                  onChange={(e) => setForm((prev) => ({ ...prev, full_name: e.target.value }))}
                  style={styles.input}
                />
              </div>

              <div style={styles.row}>
                <label htmlFor="username" style={styles.label}>Username</label>
                <input
                  id="username"
                  type="text"
                  value={form.username}
                  onChange={(e) => setForm((prev) => ({ ...prev, username: e.target.value }))}
                  style={styles.input}
                />
              </div>

              <div style={styles.row}>
                <label htmlFor="email" style={styles.label}>Email (optional)</label>
                <input
                  id="email"
                  type="email"
                  value={form.email}
                  onChange={(e) => setForm((prev) => ({ ...prev, email: e.target.value }))}
                  style={styles.input}
                />
              </div>

              <div style={styles.row}>
                <label htmlFor="role" style={styles.label}>Role</label>
                <select
                  id="role"
                  value={form.role}
                  onChange={(e) => handleRoleChange(e.target.value)}
                  style={styles.select}
                >
                  <option value="governorate_manager">Governorate manager</option>
                  <option value="administration_manager">Administration manager</option>
                  <option value="top_management">Top management (Tier 5 — system-wide)</option>
                </select>
              </div>

              {isTopManagement && (
                <div
                  style={{
                    marginBottom: 12,
                    padding: '10px 14px',
                    background: '#FFF7ED',
                    border: '1px solid #FED7AA',
                    borderRadius: 8,
                    fontSize: 13,
                    color: '#92400E',
                  }}
                >
                  ⚠ Top management accounts have system-wide access to all governorates,
                  administrations, and facilities. No geographic scope is required.
                </div>
              )}

              {facilitiesLoading && !isTopManagement ? (
                <p style={styles.loadingText}>Loading location options…</p>
              ) : (
                <GovAdminSelector
                  facilities={facilities}
                  role={form.role}
                  governorate={form.governorate}
                  administration={form.administration}
                  onChange={(patch) => setForm((prev) => ({ ...prev, ...patch }))}
                />
              )}

              <button type="submit" style={styles.button} disabled={tierDisabled}>
                {tierLoading ? 'Creating…' : 'Create higher-tier user'}
              </button>
            </form>

            {tierError && <div style={styles.error}>{tierError}</div>}
            {tierResult && <TierResultCard result={tierResult} />}
          </section>
        </>
      )}
    </div>
  );
}