import api, { setToken } from './api';

export async function login(email, password) {
  const { data } = await api.post('/auth/login', { email, password });
  setToken(data?.access_token ?? null);
  return data?.user;
}

export async function loginWithMeta(email, password) {
  const { data } = await api.post('/auth/login', { email, password });
  if (data?.requires_mfa) {
    setToken(null);
    const mfaError = new Error('MFA verification required');
    mfaError.requires_mfa = true;
    mfaError.temp_token = data?.temp_token ?? null;
    throw mfaError;
  }
  setToken(data?.access_token ?? null);
  return data;
}

export async function logout() {
  try {
    await api.post('/auth/logout');
  } finally {
    setToken(null);
    // No window.location here — AuthContext sets user to null,
    // which lets the protected route redirect via React Router (no page reload)
  }
}

export async function getMe() {
  try {
    const { data } = await api.get('/auth/me');
    return data;
  } catch {
    return null;
  }
}

export async function restoreSession() {
  try {
    const { data } = await api.post('/auth/refresh');
    const accessToken = data?.access_token ?? null;
    if (!accessToken) {
      setToken(null);
      return null;
    }
    setToken(accessToken);
    return await getMe();
  } catch (error) {
    const status = error?.response?.status;
    const isTimeout = error?.code === 'ECONNABORTED' || error?.code === 'ERR_NETWORK';
    // 401 = no valid session (expected). Timeout/network = backend not ready.
    // Both are silent; anything else is worth a warning.
    if (status !== 401 && !isTimeout && typeof console?.warn === 'function') {
      console.warn('Session restore failed unexpectedly.', error);
    }
    setToken(null);
    return null;
  }
}

export const changePassword = async (oldPassword, newPassword) => {
  if (!oldPassword || !newPassword) {
    throw new Error('oldPassword and newPassword are required');
  }
  const { data } = await api.post('/auth/change-password', {
    old_password: oldPassword,
    new_password: newPassword,
  });
  return data;
};