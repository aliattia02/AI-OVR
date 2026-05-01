import axios from 'axios';

let _token = null;
let _redirectingToLogin = false;
const IDLE_TIMEOUT_MS = 15 * 60 * 1000;
let _idleTimer = null;
let _idleListenerAttached = false;
let _idleLogoutInProgress = false;
let _lastActivityAt = Date.now();

export function setToken(token) {
  _token = token;
  if (token) {
    _lastActivityAt = Date.now();
  }
  syncIdleTimer();
}

export function getToken() {
  return _token;
}

function clearIdleTimer() {
  if (_idleTimer) {
    clearTimeout(_idleTimer);
    _idleTimer = null;
  }
}

function ensureIdleListeners() {
  if (_idleListenerAttached || typeof window === 'undefined') return;
  const events = ['mousemove', 'mousedown', 'keydown', 'scroll', 'touchstart'];
  events.forEach((eventName) => {
    window.addEventListener(eventName, handleUserActivity, { passive: true });
  });
  window.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') {
      handleUserActivity();
    }
  });
  _idleListenerAttached = true;
}

function syncIdleTimer() {
  if (typeof window === 'undefined') return;
  if (!_token) {
    clearIdleTimer();
    return;
  }
  ensureIdleListeners();
  clearIdleTimer();
  const elapsed = Date.now() - _lastActivityAt;
  const remaining = IDLE_TIMEOUT_MS - elapsed;
  if (remaining <= 0) {
    triggerIdleLogout();
    return;
  }
  _idleTimer = window.setTimeout(triggerIdleLogout, remaining);
}

function handleUserActivity() {
  if (!_token) return;
  _lastActivityAt = Date.now();
  syncIdleTimer();
}

async function triggerIdleLogout() {
  if (_idleLogoutInProgress) return;
  _idleLogoutInProgress = true;
  try {
    await axios.post('/api/auth/logout', null, { withCredentials: true });
  } catch (error) {
    if (typeof console !== 'undefined' && typeof console.warn === 'function') {
      console.warn('Idle logout failed to reach server.', error);
    }
  } finally {
    setToken(null);
    _idleLogoutInProgress = false;
    if (
      typeof window !== 'undefined' &&
      window.location.pathname !== '/login' &&
      !_redirectingToLogin
    ) {
      _redirectingToLogin = true;
      window.location.replace('/login');
    }
  }
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
      if (typeof console !== 'undefined' && typeof console.warn === 'function') {
        console.warn('Authentication refresh failed; user session has expired.');
      }
      if (
        typeof window !== 'undefined' &&
        window.location.pathname !== '/login' &&
        !_redirectingToLogin
      ) {
        _redirectingToLogin = true;
        window.location.replace('/login');
      }
      return Promise.reject(refreshError);
    }
  }
);

export default api;
