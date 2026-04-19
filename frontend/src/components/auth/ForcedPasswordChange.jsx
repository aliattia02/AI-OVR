import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { changePassword } from '../../services/auth';

export default function ForcedPasswordChange() {
  const navigate = useNavigate();
  const { onPasswordChanged } = useAuth();
  const [oldPassword, setOldPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const submit = async (event) => {
    event.preventDefault();
    setError('');
    if (newPassword.length < 8) {
      setError('New password must be at least 8 characters.');
      return;
    }
    if (newPassword !== confirmPassword) {
      setError('New password and confirmation do not match.');
      return;
    }

    setLoading(true);
    try {
      await changePassword(oldPassword, newPassword);
      await onPasswordChanged();
      navigate('/dashboard', { replace: true });
    } catch (err) {
      setError(err?.response?.data?.detail || 'Failed to change password.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <main
      style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#EEF2F7',
        padding: 16,
      }}
    >
      <form
        onSubmit={submit}
        style={{
          width: '100%',
          maxWidth: 420,
          backgroundColor: '#FFFFFF',
          border: '1px solid #E5E7EB',
          borderRadius: 12,
          padding: 20,
          display: 'grid',
          gap: 12,
        }}
      >
        <h1 style={{ margin: 0, fontSize: 20, color: '#0C2340' }}>Change Your Password</h1>
        <p style={{ margin: 0, fontSize: 13, color: '#4B5563' }}>
          For security, you must change your temporary password before continuing.
        </p>

        <input
          type="password"
          placeholder="Current password"
          value={oldPassword}
          onChange={(e) => setOldPassword(e.target.value)}
          required
          style={{ padding: '10px 12px', borderRadius: 8, border: '1px solid #D1D5DB' }}
        />
        <input
          type="password"
          placeholder="New password"
          value={newPassword}
          onChange={(e) => setNewPassword(e.target.value)}
          required
          minLength={8}
          style={{ padding: '10px 12px', borderRadius: 8, border: '1px solid #D1D5DB' }}
        />
        <input
          type="password"
          placeholder="Confirm new password"
          value={confirmPassword}
          onChange={(e) => setConfirmPassword(e.target.value)}
          required
          minLength={8}
          style={{ padding: '10px 12px', borderRadius: 8, border: '1px solid #D1D5DB' }}
        />

        {error && <div style={{ color: '#B91C1C', fontSize: 13 }}>{error}</div>}

        <button
          type="submit"
          disabled={loading}
          style={{
            border: 'none',
            borderRadius: 8,
            backgroundColor: '#0B7D6B',
            color: '#FFFFFF',
            padding: '10px 14px',
            fontWeight: 700,
            cursor: loading ? 'not-allowed' : 'pointer',
            opacity: loading ? 0.7 : 1,
          }}
        >
          {loading ? 'Saving...' : 'Change Password'}
        </button>
      </form>
    </main>
  );
}
