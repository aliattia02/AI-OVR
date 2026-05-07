import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import Modal from './Modal';
import { setToken, resetSessionTimers } from '../../services/api';

/**
 * Task 5 — Session Expiry Warning
 *
 * Mounted once at the App root (inside BrowserRouter).
 * Listens for two CustomEvents dispatched by api.js:
 *   - 'session:expiry-warning'  →  fired at 13 min of inactivity (2 min before expiry)
 *   - 'session:expired'         →  fired at 15 min (just before the hard redirect)
 *
 * "Stay Logged In"  — calls /auth/refresh, updates the token, resets all timers.
 * "Log Out Now"     — calls /auth/logout and navigates to /login immediately.
 */
export default function SessionExpiryWarning() {
  const [open, setOpen] = useState(false);
  // expired=true means the session has already lapsed; only the logout action is shown.
  const [expired, setExpired] = useState(false);
  const [loading, setLoading] = useState(false);
  const [refreshError, setRefreshError] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    const onWarning = () => {
      setExpired(false);
      setRefreshError('');
      setOpen(true);
    };

    const onExpired = () => {
      setExpired(true);
      setRefreshError('');
      setOpen(true);
    };

    window.addEventListener('session:expiry-warning', onWarning);
    window.addEventListener('session:expired', onExpired);

    return () => {
      window.removeEventListener('session:expiry-warning', onWarning);
      window.removeEventListener('session:expired', onExpired);
    };
  }, []);

  const handleStayLoggedIn = async () => {
    setLoading(true);
    setRefreshError('');
    try {
      const { data } = await axios.post('/api/auth/refresh', null, { withCredentials: true });
      const nextToken = data?.access_token ?? null;
      if (!nextToken) throw new Error('Empty refresh response');
      setToken(nextToken);
      resetSessionTimers();
      setOpen(false);
    } catch {
      // Refresh failed — the session is truly gone; fall through to the login page.
      setRefreshError('Could not extend your session. Please log in again.');
    } finally {
      setLoading(false);
    }
  };

  const handleLogOut = async () => {
    setLoading(true);
    try {
      await axios.post('/api/auth/logout', null, { withCredentials: true });
    } catch {
      // Ignore server-side errors; clear the client session regardless.
    } finally {
      setToken(null);
      setLoading(false);
      navigate('/login', { replace: true });
    }
  };

  if (!open) return null;

  return (
    <Modal
      title={expired ? 'Session Expired' : 'Session Expiring Soon'}
      // Prevent accidental dismissal when the session is already gone.
      onClose={expired ? undefined : () => setOpen(false)}
      size="sm"
    >
      <p style={{ margin: '0 0 4px', color: '#374151', fontSize: 14, lineHeight: 1.5 }}>
        {expired
          ? 'Your session has expired due to inactivity.'
          : 'Your session will expire in 2 minutes due to inactivity. Would you like to stay logged in?'}
      </p>

      {refreshError && (
        <p
          role="alert"
          style={{
            margin: '8px 0 0',
            color: '#DC2626',
            fontSize: 13,
            backgroundColor: '#FEF2F2',
            border: '1px solid #FECACA',
            borderRadius: 6,
            padding: '6px 10px',
          }}
        >
          {refreshError}
        </p>
      )}

      <div
        style={{
          display: 'flex',
          gap: 10,
          justifyContent: 'flex-end',
          marginTop: 20,
        }}
      >
        <button
          type="button"
          onClick={handleLogOut}
          disabled={loading}
          style={{
            padding: '8px 16px',
            borderRadius: 8,
            border: '1px solid #D1D5DB',
            backgroundColor: '#FFFFFF',
            color: '#374151',
            fontSize: 13,
            fontWeight: 600,
            cursor: loading ? 'not-allowed' : 'pointer',
            opacity: loading ? 0.6 : 1,
          }}
        >
          Log Out Now
        </button>

        {!expired && (
          <button
            type="button"
            onClick={handleStayLoggedIn}
            disabled={loading}
            style={{
              padding: '8px 16px',
              borderRadius: 8,
              border: 'none',
              backgroundColor: '#0C2340',
              color: '#FFFFFF',
              fontSize: 13,
              fontWeight: 600,
              cursor: loading ? 'not-allowed' : 'pointer',
              opacity: loading ? 0.7 : 1,
            }}
          >
            {loading ? 'Refreshing…' : 'Stay Logged In'}
          </button>
        )}
      </div>
    </Modal>
  );
}
