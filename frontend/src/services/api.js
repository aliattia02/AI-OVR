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
});

api.interceptors.request.use((config) => {
  const nextConfig = { ...config };
  if (_token) {
    nextConfig.headers = nextConfig.headers ?? {};
    nextConfig.headers.Authorization = `Bearer ${_token}`;
  }
  return nextConfig;
});

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error?.config;
    const isUnauthorized = error?.response?.status === 401;
    const isRefreshRequest = originalRequest?.url === '/auth/refresh';

    if (!isUnauthorized || !originalRequest || originalRequest._retry || isRefreshRequest) {
      return Promise.reject(error);
    }

    originalRequest._retry = true;

    try {
      const refreshResponse = await axios.post('/api/auth/refresh', null, { withCredentials: true });
      const nextToken = refreshResponse?.data?.access_token ?? null;

      if (!nextToken) {
        throw new Error('Refresh response missing access token');
      }

      setToken(nextToken);
      originalRequest.headers = originalRequest.headers ?? {};
      originalRequest.headers.Authorization = `Bearer ${nextToken}`;
      return api(originalRequest);
    } catch (refreshError) {
      setToken(null);
      if (typeof window !== 'undefined') {
        window.location.assign('/login');
      }
      return Promise.reject(refreshError);
    }
  }
);

export default api;
