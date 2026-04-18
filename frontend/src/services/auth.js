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
    if (typeof window !== 'undefined') {
      window.location.assign('/login');
    }
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
