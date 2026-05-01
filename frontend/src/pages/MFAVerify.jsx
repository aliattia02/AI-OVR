import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import api, { setToken } from '../services/api';
import { MFA_TEMP_TOKEN_STORAGE_KEY } from '../utils/authStorage';

const styles = {
  page: {
    maxWidth: 420,
    margin: '80px auto',
    padding: '0 16px',
    color: '#0c2340',
    fontFamily: '"Segoe UI", system-ui, sans-serif',
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
  fieldError: {
    marginTop: 6,
    fontSize: 12,
    color: '#dc2626',
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
};

export default function MFAVerify() {
  const navigate = useNavigate();
  const { onPasswordChanged } = useAuth();
  const [tempToken, setTempToken] = useState(null);
  const [error, setError] = useState('');
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm({
    defaultValues: {
      totpCode: '',
    },
  });

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const storedToken = sessionStorage.getItem(MFA_TEMP_TOKEN_STORAGE_KEY);
    if (!storedToken) {
      navigate('/login', { replace: true });
      return;
    }
    setTempToken(storedToken);
  }, [navigate]);

  const onSubmit = async (values) => {
    setError('');
    const activeToken = tempToken ||
      (typeof window !== 'undefined' ? sessionStorage.getItem(MFA_TEMP_TOKEN_STORAGE_KEY) : null);

    if (!activeToken) {
      navigate('/login', { replace: true });
      return;
    }

    try {
      const { data } = await api.post('/auth/mfa/verify', {
        temp_token: activeToken,
        totp_code: values.totpCode,
      });
      const accessToken = data?.access_token;
      if (!accessToken) {
        throw new Error('Missing access token.');
      }
      setToken(accessToken);
      if (typeof window !== 'undefined') {
        sessionStorage.removeItem(MFA_TEMP_TOKEN_STORAGE_KEY);
      }
      await onPasswordChanged();
      navigate('/', { replace: true });
    } catch (err) {
      const message = err?.response?.data?.detail || err?.message || 'Verification failed. Please try again.';
      setError(typeof message === 'string' ? message : 'Verification failed. Please try again.');
    }
  };

  if (!tempToken) {
    return null;
  }

  return (
    <div style={styles.page}>
      <h1 style={styles.heading}>Multi-factor verification</h1>
      <p style={styles.subtext}>Enter the 6-digit code from your authenticator app to finish signing in.</p>

      <div style={styles.card}>
        {error ? <div style={styles.error}>{error}</div> : null}

        <form onSubmit={handleSubmit(onSubmit)} noValidate>
          <label htmlFor="mfa-code" style={styles.label}>
            Verification code
          </label>
          <input
            id="mfa-code"
            type="text"
            inputMode="numeric"
            autoComplete="one-time-code"
            maxLength={6}
            disabled={isSubmitting}
            style={styles.input}
            {...register('totpCode', {
              required: 'Enter the 6-digit code.',
              pattern: {
                value: /^\d{6}$/,
                message: 'Enter a valid 6-digit code.',
              },
              setValueAs: (value) => (typeof value === 'string' ? value.replace(/\D/g, '') : value),
            })}
          />
          {errors.totpCode ? <div style={styles.fieldError}>{errors.totpCode.message}</div> : null}

          <button type="submit" disabled={isSubmitting} style={styles.primaryButton}>
            {isSubmitting ? 'Verifying…' : 'Verify and continue'}
          </button>
        </form>
      </div>
    </div>
  );
}
