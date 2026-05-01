import { useCallback, useEffect, useState } from 'react';
import { QRCodeCanvas } from 'qrcode.react';
import api from '../services/api';

const styles = {
  page: {
    maxWidth: 640,
    margin: '80px auto',
    padding: '0 16px 40px',
    color: '#0c2340',
  },
  heading: {
    fontSize: 28,
    fontWeight: 700,
    marginBottom: 10,
  },
  subtext: {
    color: '#4b5563',
    fontSize: 14,
    lineHeight: 1.6,
    marginBottom: 20,
  },
  card: {
    background: '#fff',
    borderRadius: 14,
    border: '1px solid #e5e7eb',
    padding: 24,
    boxShadow: '0 8px 32px rgba(12,35,64,0.08)',
  },
  error: {
    background: '#fee2e2',
    color: '#dc2626',
    border: '1px solid #dc262630',
    borderRadius: 8,
    padding: 12,
    fontSize: 14,
    marginBottom: 16,
  },
  row: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: 24,
    alignItems: 'center',
  },
  qrBox: {
    padding: 12,
    borderRadius: 12,
    border: '1px solid #e5e7eb',
    background: '#f9fafb',
  },
  secretLabel: {
    fontSize: 13,
    fontWeight: 600,
    marginBottom: 6,
    color: '#1f2937',
  },
  secretValue: {
    fontFamily: '"SFMono-Regular", Consolas, "Liberation Mono", Menlo, monospace',
    fontSize: 16,
    padding: '10px 12px',
    borderRadius: 8,
    border: '1px solid #e5e7eb',
    background: '#f3f4f6',
    letterSpacing: '0.08em',
    color: '#0c2340',
    wordBreak: 'break-all',
  },
  button: {
    border: 'none',
    borderRadius: 8,
    padding: '10px 14px',
    fontWeight: 700,
    background: '#0b7d6b',
    color: '#fff',
    cursor: 'pointer',
    marginTop: 18,
  },
  note: {
    fontSize: 13,
    color: '#4b5563',
    marginTop: 16,
    lineHeight: 1.5,
  },
};

export default function MFASetup() {
  const [secret, setSecret] = useState('');
  const [otpauthUri, setOtpauthUri] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const loadSetup = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const { data } = await api.post('/auth/mfa/setup');
      setSecret(data?.secret ?? '');
      setOtpauthUri(data?.otpauth_uri ?? '');
    } catch (err) {
      setError(err?.response?.data?.detail || 'Unable to generate MFA setup details.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadSetup();
  }, [loadSetup]);

  return (
    <div style={styles.page}>
      <h1 style={styles.heading}>Set up multi-factor authentication</h1>
      <p style={styles.subtext}>
        Scan the QR code with your authenticator app (Google Authenticator, Microsoft Authenticator, Authy),
        or enter the secret manually. Keep the secret private.
      </p>

      {error ? <div style={styles.error}>{error}</div> : null}

      <div style={styles.card}>
        <div style={styles.row}>
          <div style={styles.qrBox}>
            {loading ? (
              <div style={{ padding: 32, color: '#6b7280' }}>Generating QR…</div>
            ) : (
              <QRCodeCanvas value={otpauthUri || ' '} size={180} />
            )}
          </div>
          <div style={{ flex: 1, minWidth: 220 }}>
            <div style={styles.secretLabel}>Manual setup secret</div>
            <div style={styles.secretValue}>{secret || (loading ? 'Loading…' : 'Unavailable')}</div>
            <div style={styles.note}>
              After adding the account in your authenticator app, use the 6-digit code it generates when you
              log in.
            </div>
            <button type="button" onClick={loadSetup} style={styles.button} disabled={loading}>
              {loading ? 'Refreshing…' : 'Generate new QR code'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
