import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';

const styles = {
  page: {
    maxWidth: 720,
    margin: '80px auto',
    padding: '0 16px 40px',
    color: '#0c2340',
    fontFamily: '"Segoe UI", system-ui, sans-serif',
  },
  heading: {
    fontSize: 28,
    fontWeight: 700,
    marginBottom: 8,
  },
  subtext: {
    color: '#4b5563',
    fontSize: 14,
    lineHeight: 1.6,
    marginBottom: 18,
  },
  card: {
    background: '#fff',
    borderRadius: 14,
    border: '1px solid #e5e7eb',
    padding: 24,
    boxShadow: '0 8px 28px rgba(12,35,64,0.08)',
  },
  row: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: 24,
    alignItems: 'center',
    marginBottom: 20,
  },
  qrBox: {
    padding: 12,
    borderRadius: 12,
    border: '1px solid #e5e7eb',
    background: '#f9fafb',
  },
  qrImage: {
    display: 'block',
  },
  secretBlock: {
    flex: 1,
    minWidth: 220,
  },
  secretLabel: {
    fontSize: 13,
    fontWeight: 600,
    marginBottom: 6,
    color: '#1f2937',
  },
  secretValue: {
    display: 'block',
    fontFamily: '"SFMono-Regular", Consolas, "Liberation Mono", Menlo, monospace',
    fontSize: 15,
    padding: '10px 12px',
    borderRadius: 8,
    border: '1px solid #e5e7eb',
    background: '#f3f4f6',
    letterSpacing: '0.08em',
    color: '#0c2340',
    wordBreak: 'break-all',
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
    marginTop: 14,
  },
  error: {
    background: '#fee2e2',
    color: '#dc2626',
    border: '1px solid #dc262630',
    borderRadius: 8,
    padding: 12,
    fontSize: 13,
    marginBottom: 16,
  },
  success: {
    background: '#dcfce7',
    color: '#166534',
    border: '1px solid #16a34a30',
    borderRadius: 8,
    padding: 12,
    fontSize: 13,
    marginBottom: 16,
  },
  fieldError: {
    marginTop: 6,
    fontSize: 12,
    color: '#dc2626',
  },
  loading: {
    padding: 32,
    color: '#6b7280',
    fontSize: 14,
  },
};

export default function MFASetup() {
  const navigate = useNavigate();
  const [otpauthUri, setOtpauthUri] = useState('');
  const [secret, setSecret] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
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
    let isMounted = true;

    const loadSetup = async () => {
      setLoading(true);
      setError('');
      try {
        const { data } = await api.post('/auth/mfa/setup');
        if (!isMounted) return;
        setOtpauthUri(data?.otpauth_uri ?? '');
        setSecret(data?.secret ?? '');
      } catch (err) {
        if (!isMounted) return;
        setError(err?.response?.data?.detail || 'Unable to generate MFA setup details.');
      } finally {
        if (!isMounted) return;
        setLoading(false);
      }
    };

    loadSetup();

    return () => {
      isMounted = false;
    };
  }, []);

  const onSubmit = async (values) => {
    setError('');
    setSuccess('');
    try {
      await api.post('/auth/mfa/verify', {
        temp_token: '',
        totp_code: values.totpCode,
      });
      setSuccess('MFA enrolled successfully');
      navigate('/', { replace: true });
    } catch (err) {
      setError(err?.response?.data?.detail || 'Verification failed. Please try again.');
    }
  };

  const qrSrc = otpauthUri
    ? `https://chart.googleapis.com/chart?chs=200x200&chld=M|0&cht=qr&chl=${encodeURIComponent(
      otpauthUri
    )}`
    : '';

  return (
    <div style={styles.page}>
      <h1 style={styles.heading}>Set up multi-factor authentication</h1>
      <p style={styles.subtext}>
        Scan the QR code with your authenticator app, or enter the secret manually. Then enter the
        6-digit code to confirm enrollment.
      </p>

      {error ? <div style={styles.error}>{error}</div> : null}
      {success ? <div style={styles.success}>{success}</div> : null}

      {error ? null : (
        <div style={styles.card}>
          {loading ? (
            <div style={styles.loading}>Generating QR…</div>
          ) : (
            <div style={styles.row}>
              <div style={styles.qrBox}>
                {qrSrc ? (
                  <img src={qrSrc} alt="MFA QR code" width={200} height={200} style={styles.qrImage} />
                ) : (
                  <div style={styles.loading}>QR unavailable</div>
                )}
              </div>
              <div style={styles.secretBlock}>
                <div style={styles.secretLabel}>Manual setup secret</div>
                <code style={styles.secretValue}>{secret || 'Unavailable'}</code>
              </div>
            </div>
          )}

          <form onSubmit={handleSubmit(onSubmit)} noValidate>
            <label htmlFor="totp-code" style={styles.label}>
              Enter the 6-digit code from your authenticator
            </label>
            <input
              id="totp-code"
              type="text"
              inputMode="numeric"
              autoComplete="one-time-code"
              maxLength={6}
              disabled={loading || isSubmitting}
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
            <button type="submit" disabled={loading || isSubmitting} style={styles.primaryButton}>
              {isSubmitting ? 'Verifying…' : 'Confirm MFA enrollment'}
            </button>
          </form>
        </div>
      )}
    </div>
  );
}
