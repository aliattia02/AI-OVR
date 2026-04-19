import api, { setToken } from './api';

export async function login(email, password) {
  const { data } = await api.post('/auth/login', { email, password });
  setToken(data?.access_token ?? null);
  return data?.user;
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

export const changePassword = async (oldPassword, newPassword) => {
  const { data } = await api.post('/auth/change-password', {
    old_password: oldPassword,
    new_password: newPassword,
  });
  return data;
};
