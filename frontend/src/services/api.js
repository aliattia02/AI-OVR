import axios from 'axios';

let _token = null;

export function setToken(token) {
  _token = token;
}

export function getToken() {
  return _token;
}

const api = axios.create({
  baseURL: '/api',
  withCredentials: true, // ensures the refresh cookie is sent automatically
});

api.interceptors.request.use((config) => {
  if (_token) {
    config.headers = config.headers ?? {};
    config.headers.Authorization = `Bearer ${_token}`;
  }
  return config;
});

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error?.config;
    const isUnauthorized = error?.response?.status === 401;
    const requestUrl = originalRequest?.url || '';
    const isNonRetryAuthRoute =
      requestUrl.includes('/auth/login') ||
      requestUrl.includes('/auth/refresh') ||
      requestUrl.includes('/auth/logout');

    // Don't retry login/refresh/logout requests to prevent loops
    if (!isUnauthorized || !originalRequest || originalRequest._retry || isNonRetryAuthRoute) {
      return Promise.reject(error);
    }

    originalRequest._retry = true;

    try {
      const { data } = await axios.post('/api/auth/refresh', null, { withCredentials: true });
      const nextToken = data?.access_token ?? null;

      if (!nextToken) throw new Error('No token in refresh response');

      setToken(nextToken);
      originalRequest.headers = originalRequest.headers ?? {};
      originalRequest.headers.Authorization = `Bearer ${nextToken}`;
      return api(originalRequest);
    } catch (refreshError) {
      setToken(null);
      if (typeof window !== 'undefined' && window.location.pathname !== '/login') {
        window.location.replace('/login');
      }
      return Promise.reject(refreshError);
    }
  }
);

export default api;
