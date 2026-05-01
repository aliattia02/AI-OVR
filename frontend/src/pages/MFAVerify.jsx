import { useMemo, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import api, { setToken } from '../services/api';
import { MFA_TEMP_TOKEN_STORAGE_KEY } from '../utils/authStorage';

const TEMP_TOKEN_KEY = MFA_TEMP_TOKEN_STORAGE_KEY;

const styles = {
  page: {
    maxWidth: 420,
    margin: '80px auto',
    padding: '0 16px',
    color: '#0c2340',
  },
  heading: {
    fontSize: 26,
    fontWeight: 700,
    marginBottom: 8,
  },
  subtext: {
    color: '#4b5563',
    fontSize: 14,
    lineHeight: 1.5,
    marginBottom: 20,
  },
  card: {
    background: '#fff',
    borderRadius: 14,
    border: '1px solid #e5e7eb',
    padding: '24px 22px',
    boxShadow: '0 8px 28px rgba(12,35,64,0.08)',
  },
  error: {
    background: '#fee2e2',
    color: '#dc2626',
    border: '1px solid #dc262630',
    borderRadius: 8,
    padding: 12,
    fontSize: 13,
    marginBottom: 14,
  },
  label: {
    display: 'block',
    fontSize: 13,
    fontWeight: 600,
    marginBottom: 6,
    color: '#1f2937',
  },
  input: {
    width: '100%',
    padding: '10px 12px',
    borderRadius: 8,
    border: '1px solid #e5e7eb',
    fontSize: 16,
    letterSpacing: '0.3em',
    textAlign: 'center',
    fontFamily: '"SFMono-Regular", Consolas, "Liberation Mono", Menlo, monospace',
  },
  primaryButton: {
    width: '100%',
    border: 'none',
    borderRadius: 8,
    padding: '11px 14px',
    fontWeight: 700,
    background: '#0b7d6b',
    color: '#fff',
    cursor: 'pointer',
    marginTop: 16,
  },
  secondaryButton: {
    width: '100%',
    border: '1px solid #e5e7eb',
    borderRadius: 8,
    padding: '10px 14px',
    fontWeight: 600,
    background: '#f9fafb',
    color: '#1f2937',
    cursor: 'pointer',
    marginTop: 10,
  },
};

export default function MFAVerify() {
  const location = useLocation();
  const navigate = useNavigate();
  const { onPasswordChanged } = useAuth();
  const [code, setCode] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const tempToken = useMemo(() => {
    if (location?.state?.tempToken) return location.state.tempToken;
    if (typeof window === 'undefined') return null;
    return sessionStorage.getItem(TEMP_TOKEN_KEY);
  }, [location]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    const trimmedCode = code.trim();
    if (!tempToken) {
      setError('Your MFA session expired. Please sign in again.');
      return;
    }
    if (!trimmedCode) {
      setError('Enter the 6-digit code from your authenticator app.');
      return;
    }

    setLoading(true);
    try {
      const { data } = await api.post('/auth/mfa/verify', {
        temp_token: tempToken,
        code: trimmedCode,
      });
      const accessToken = data?.access_token;
      if (!accessToken) {
        throw new Error('Missing access token.');
      }
      setToken(accessToken);
      if (typeof window !== 'undefined') {
        sessionStorage.removeItem(TEMP_TOKEN_KEY);
      }
      await onPasswordChanged();
    } catch (err) {
      setError(err?.response?.data?.detail || 'Verification failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={styles.page}>
      <h1 style={styles.heading}>Multi-factor verification</h1>
      <p style={styles.subtext}>
        Enter the 6-digit code from your authenticator app to finish signing in.
      </p>

      <div style={styles.card}>
        {error ? <div style={styles.error}>{error}</div> : null}

        <form onSubmit={handleSubmit}>
          <label htmlFor="mfa-code" style={styles.label}>
            Verification code
          </label>
          <input
            id="mfa-code"
            type="text"
            inputMode="numeric"
            autoComplete="one-time-code"
            value={code}
            onChange={(e) => setCode(e.target.value.replace(/\s+/g, ''))}
            maxLength={6}
            disabled={loading}
            style={styles.input}
          />

          <button type="submit" disabled={loading} style={styles.primaryButton}>
            {loading ? 'Verifying…' : 'Verify and continue'}
          </button>
          <button
            type="button"
            onClick={() => navigate('/login', { replace: true })}
            style={styles.secondaryButton}
          >
            Back to sign in
          </button>
        </form>
      </div>
    </div>
  );
}
