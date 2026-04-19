import { useState } from 'react';
import { provisionFacility, provisionTierUser } from '../services/admin';

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
  },
  button: {
    border: '1px solid var(--color-primary-border)',
    borderRadius: 8,
    padding: '10px 12px',
    fontWeight: 700,
    background: 'var(--color-primary)',
    color: 'var(--color-button-text)',
    cursor: 'pointer',
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
  result: {
    background: 'var(--color-background-secondary)',
    padding: 16,
    borderRadius: 8,
    fontSize: 13,
    overflowX: 'auto',
    marginTop: 12,
    border: '1px solid var(--color-border-secondary)',
    color: 'var(--color-text-primary)',
  },
};

export default function AdminProvision() {
  const [facilityId, setFacilityId] = useState('');
  const [facilityResult, setFacilityResult] = useState(null);
  const [facilityError, setFacilityError] = useState('');
  const [facilityLoading, setFacilityLoading] = useState(false);

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

  const onFacilitySubmit = async (e) => {
    e.preventDefault();
    setFacilityError('');
    setFacilityResult(null);
    setFacilityLoading(true);
    try {
      const result = await provisionFacility(facilityId.trim());
      setFacilityResult(result);
    } catch (e) {
      setFacilityError(e?.response?.data?.detail || 'Failed to provision facility credentials.');
    } finally {
      setFacilityLoading(false);
    }
  };

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
      if (form.governorate.trim()) payload.governorate = form.governorate.trim();
      if (form.role === 'administration_manager' && form.administration.trim()) {
        payload.administration = form.administration.trim();
      }
      const result = await provisionTierUser(payload);
      setTierResult(result);
    } catch (e) {
      setTierError(e?.response?.data?.detail || 'Failed to create higher-tier user.');
    } finally {
      setTierLoading(false);
    }
  };

  const tierDisabled =
    tierLoading ||
    !form.full_name.trim() ||
    !form.username.trim() ||
    !form.role ||
    !form.governorate.trim() ||
    (form.role === 'administration_manager' && !form.administration.trim());

  return (
    <div style={styles.page}>
      <h1 style={styles.title}>User provisioning</h1>
      <p style={styles.note}>
        Top management only. Temporary passwords are shown once — copy them immediately.
      </p>

      <section style={styles.section}>
        <h2 style={styles.sectionTitle}>Provision facility credentials</h2>
        <p style={styles.sectionDesc}>
          Creates a staff reporter and quality admin account. The patient link UUID is already on the facility record.
        </p>
        <form onSubmit={onFacilitySubmit}>
          <div style={styles.row}>
            <label htmlFor="facility-id" style={styles.label}>
              Facility ID
            </label>
            <input
              id="facility-id"
              type="text"
              value={facilityId}
              onChange={(e) => setFacilityId(e.target.value)}
              style={styles.input}
            />
          </div>
          <button type="submit" style={styles.button} disabled={facilityLoading || !facilityId.trim()}>
            Provision 3 credentials
          </button>
        </form>
        {facilityError ? <div style={styles.error}>{facilityError}</div> : null}
        {facilityResult ? <pre style={styles.result}>{JSON.stringify(facilityResult, null, 2)}</pre> : null}
      </section>

      <section style={styles.section}>
        <h2 style={styles.sectionTitle}>Create governorate / administration user</h2>
        <p style={styles.sectionDesc}>
          Creates a higher-tier account. Temporary password is shown once.
        </p>
        <form onSubmit={onTierSubmit}>
          <div style={styles.row}>
            <label htmlFor="full-name" style={styles.label}>
              Full name
            </label>
            <input
              id="full-name"
              type="text"
              value={form.full_name}
              onChange={(e) => setForm((prev) => ({ ...prev, full_name: e.target.value }))}
              style={styles.input}
            />
          </div>

          <div style={styles.row}>
            <label htmlFor="username" style={styles.label}>
              Username
            </label>
            <input
              id="username"
              type="text"
              value={form.username}
              onChange={(e) => setForm((prev) => ({ ...prev, username: e.target.value }))}
              style={styles.input}
            />
          </div>

          <div style={styles.row}>
            <label htmlFor="email" style={styles.label}>
              Email (optional)
            </label>
            <input
              id="email"
              type="email"
              value={form.email}
              onChange={(e) => setForm((prev) => ({ ...prev, email: e.target.value }))}
              style={styles.input}
            />
          </div>

          <div style={styles.row}>
            <label htmlFor="role" style={styles.label}>
              Role
            </label>
            <select
              id="role"
              value={form.role}
              onChange={(e) =>
                setForm((prev) => ({
                  ...prev,
                  role: e.target.value,
                  administration:
                    e.target.value === 'administration_manager' ? prev.administration : '',
                }))
              }
              style={styles.input}
            >
              <option value="governorate_manager">Governorate manager</option>
              <option value="administration_manager">Administration manager</option>
            </select>
          </div>

          <div style={styles.row}>
            <label htmlFor="governorate" style={styles.label}>
              Governorate
            </label>
            <input
              id="governorate"
              type="text"
              value={form.governorate}
              onChange={(e) => setForm((prev) => ({ ...prev, governorate: e.target.value }))}
              style={styles.input}
            />
          </div>

          {form.role === 'administration_manager' ? (
            <div style={styles.row}>
              <label htmlFor="administration" style={styles.label}>
                Administration
              </label>
              <input
                id="administration"
                type="text"
                value={form.administration}
                onChange={(e) => setForm((prev) => ({ ...prev, administration: e.target.value }))}
                style={styles.input}
              />
            </div>
          ) : null}

          <button type="submit" style={styles.button} disabled={tierDisabled}>
            {tierLoading ? 'Creating…' : 'Create higher-tier user'}
          </button>
        </form>
        {tierError ? <div style={styles.error}>{tierError}</div> : null}
        {tierResult ? <pre style={styles.result}>{JSON.stringify(tierResult, null, 2)}</pre> : null}
      </section>
    </div>
  );
}
