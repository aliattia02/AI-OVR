import { useContext, useState } from 'react';
import { AuthContext } from '../context/AuthContext';
import { changePassword } from '../services/auth';

const styles = {
  page: {
    maxWidth: 400,
    margin: '80px auto',
    padding: '0 16px',
    color: 'var(--color-text-primary)',
  },
  heading: {
    fontSize: 28,
    fontWeight: 700,
    marginBottom: 8,
  },
  subtext: {
    color: 'var(--color-text-secondary)',
    fontSize: 14,
    lineHeight: 1.5,
    marginBottom: 20,
  },
  error: {
    background: 'var(--color-danger-background)',
    color: 'var(--color-danger-text)',
    border: '1px solid var(--color-danger-border)',
    borderRadius: 8,
    padding: 12,
    fontSize: 14,
    marginBottom: 16,
  },
  fieldGroup: {
    marginBottom: 14,
  },
  label: {
    display: 'block',
    fontSize: 13,
    fontWeight: 600,
    marginBottom: 6,
    color: 'var(--color-text-primary)',
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
    width: '100%',
    border: '1px solid var(--color-primary-border)',
    borderRadius: 8,
    padding: '11px 14px',
    fontWeight: 700,
    color: 'var(--color-button-text)',
    background: 'var(--color-primary)',
    cursor: 'pointer',
    marginTop: 8,
  },
};

export default function ChangePassword() {
  const { onPasswordChanged } = useContext(AuthContext);
  const [oldPw, setOldPw] = useState('');
  const [newPw, setNewPw] = useState('');
  const [confirmPw, setConfirmPw] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const disabled = loading || !oldPw || !newPw || !confirmPw;

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (newPw.length < 8) {
      setError('New password must be at least 8 characters.');
      return;
    }
    if (newPw !== confirmPw) {
      setError('Passwords do not match.');
      return;
    }
    if (newPw === oldPw) {
      setError('New password must differ from the temporary password.');
      return;
    }

    setError('');
    setLoading(true);
    try {
      await changePassword(oldPw, newPw);
      await onPasswordChanged();
    } catch (e) {
      setError(e?.response?.data?.detail || 'Failed to change password.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={styles.page}>
      <h1 style={styles.heading}>Set your password</h1>
      <p style={styles.subtext}>
        Your account was created with a temporary password. Please set a new one to continue.
      </p>

      {error ? <div style={styles.error}>{error}</div> : null}

      <form onSubmit={handleSubmit}>
        <div style={styles.fieldGroup}>
          <label htmlFor="temporary-password" style={styles.label}>
            Temporary password
          </label>
          <input
            id="temporary-password"
            type="password"
            value={oldPw}
            onChange={(e) => setOldPw(e.target.value)}
            autoComplete="current-password"
            style={styles.input}
          />
        </div>

        <div style={styles.fieldGroup}>
          <label htmlFor="new-password" style={styles.label}>
            New password (min. 8 characters)
          </label>
          <input
            id="new-password"
            type="password"
            value={newPw}
            onChange={(e) => setNewPw(e.target.value)}
            autoComplete="new-password"
            style={styles.input}
          />
        </div>

        <div style={styles.fieldGroup}>
          <label htmlFor="confirm-password" style={styles.label}>
            Confirm new password
          </label>
          <input
            id="confirm-password"
            type="password"
            value={confirmPw}
            onChange={(e) => setConfirmPw(e.target.value)}
            autoComplete="new-password"
            style={styles.input}
          />
        </div>

        <button type="submit" disabled={disabled} style={styles.button}>
          {loading ? 'Saving…' : 'Set password and continue'}
        </button>
      </form>
    </div>
  );
}
