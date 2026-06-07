import axios from 'axios';

let _token = null;
let _redirectingToLogin = false;

// 15-minute idle timeout to align with the access token TTL.
const IDLE_TIMEOUT_MS = 15 * 60 * 1000;
// Task 5: warn the user 2 minutes before the session expires.
const WARNING_TIMEOUT_MS = 13 * 60 * 1000;

let _warningTimer = null;
let _idleTimer = null;
let _idleListenerAttached = false;
let _idleLogoutInProgress = false;
let _lastActivityAt = getNow();

export function setToken(token) {
  _token = token;
  if (token) {
    _lastActivityAt = getNow();
    // Reset the redirect flag so future 401s can trigger a redirect again
    // (e.g. after a successful re-login following a session expiry).
    _redirectingToLogin = false;
  }
  syncIdleTimer();
}

export function getToken() {
  return _token;
}

// Task 5: called by SessionExpiryWarning after a successful token refresh.
export function resetSessionTimers() {
  _lastActivityAt = getNow();
  syncIdleTimer();
}

function getNow() {
  if (typeof performance !== 'undefined' && typeof performance.now === 'function') {
    return performance.now();
  }
  return Date.now();
}

function clearSessionTimers() {
  if (_warningTimer) {
    clearTimeout(_warningTimer);
    _warningTimer = null;
  }
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
    clearSessionTimers();
    return;
  }
  ensureIdleListeners();
  clearSessionTimers();

  const elapsed = getNow() - _lastActivityAt;
  const remainingLogout = IDLE_TIMEOUT_MS - elapsed;

  if (remainingLogout <= 0) {
    triggerIdleLogout();
    return;
  }

  // Schedule warning 2 minutes before expiry (only if there is still time left).
  const remainingWarning = WARNING_TIMEOUT_MS - elapsed;
  if (remainingWarning > 0) {
    _warningTimer = window.setTimeout(() => {
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('session:expiry-warning'));
      }
    }, remainingWarning);
  }

  _idleTimer = window.setTimeout(triggerIdleLogout, remainingLogout);
}

function handleUserActivity() {
  if (!_token) return;
  _lastActivityAt = getNow();
  syncIdleTimer();
}

async function triggerIdleLogout() {
  if (_idleLogoutInProgress) return;
  _idleLogoutInProgress = true;

  // Task 5: notify the UI before the server call so SessionExpiryWarning can
  // update its state synchronously (the redirect below will follow shortly).
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('session:expired'));
  }

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
  // Prevent the spinner from hanging forever if the backend is unreachable
  // or the DB hangs on a query (e.g. during startup / connection pool exhaustion).
  timeout: 10_000,
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