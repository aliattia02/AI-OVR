import { useContext, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';
import { changePassword } from '../services/auth';

export default function ChangePassword() {
  const { onPasswordChanged } = useContext(AuthContext);
  const navigate = useNavigate();
  const [oldPw, setOldPw] = useState('');
  const [newPw, setNewPw] = useState('');
  const [confirmPw, setConfirm] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError('');
    if (newPw.length < 8) return setError('New password must be at least 8 characters.');
    if (newPw !== confirmPw) return setError('Passwords do not match.');
    setLoading(true);
    try {
      await changePassword(oldPw, newPw);
      await onPasswordChanged();
      navigate('/', { replace: true });
    } catch (e) {
      setError(e?.response?.data?.detail || 'Failed to change password.');
    } finally {
      setLoading(false);
    }
  };

  const inputStyle = {
    display: 'block', width: '100%', marginTop: 4, padding: '8px 12px',
    borderRadius: 8, border: '1px solid var(--color-border-secondary)',
    background: 'var(--color-background-primary)',
    color: 'var(--color-text-primary)', boxSizing: 'border-box',
  };

  return (
    <main style={{ maxWidth: 480, margin: '40px auto', padding: 16 }}>
      <h2>Change Password</h2>
      <p>You must change your password before continuing.</p>
      <form onSubmit={handleSubmit} style={{ display: 'grid', gap: 12 }}>
        <label>
          Current password
          <input type="password" value={oldPw} onChange={(e) => setOldPw(e.target.value)} style={inputStyle} />
        </label>
        <label>
          New password
          <input type="password" value={newPw} onChange={(e) => setNewPw(e.target.value)} style={inputStyle} />
        </label>
        <label>
          Confirm new password
          <input type="password" value={confirmPw} onChange={(e) => setConfirm(e.target.value)} style={inputStyle} />
        </label>
        {error ? <div style={{ color: 'crimson' }}>{error}</div> : null}
        <button type="submit" disabled={loading}>
          {loading ? 'Changing...' : 'Change Password'}
        </button>
      </form>
    </main>
  );
}
