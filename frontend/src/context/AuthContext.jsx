import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import Spinner from '../components/shared/Spinner';
import * as authService from '../services/auth';

export const AuthContext = createContext(undefined);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [mustChangePassword, setMustChangePassword] = useState(false);
  const restorePromiseRef = useRef(null); // stores the promise, not a boolean

  const navigateTo = useCallback((path) => {
    if (typeof window === 'undefined') return;
    window.history.pushState({}, '', path);
    window.dispatchEvent(new PopStateEvent('popstate'));
  }, []);

  useEffect(() => {
    let isMounted = true;

    // Only kick off the restore once across StrictMode double-mount.
    // Run #1 creates and stores the promise.
    // Run #2 reuses the same promise and attaches a fresh .then() with its own isMounted guard.
    if (!restorePromiseRef.current) {
      restorePromiseRef.current = authService.restoreSession();
    }

    restorePromiseRef.current
      .then(me => {
        if (!isMounted) return;
        setUser(me);
      })
      .catch(() => {
        if (!isMounted) return;
        setUser(null);
      })
      .finally(() => {
        if (!isMounted) return;
        setLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, []);

  const login = useCallback(async (email, password) => {
    const data = await authService.loginWithMeta(email, password);
    if (data?.must_change_password) {
      setMustChangePassword(true);
      navigateTo('/change-password');
      return null;
    }
    const me = await authService.getMe();
    setUser(me ?? null);
    return me;
  }, [navigateTo]);

  const logout = useCallback(async () => {
    try {
      await authService.logout();
    } finally {
      setUser(null);
    }
  }, []);

  const onPasswordChanged = useCallback(async () => {
    setMustChangePassword(false);
    const me = await authService.getMe();
    setUser(me);
    navigateTo('/');
  }, [navigateTo]);

  const value = useMemo(
    () => ({
      user,
      loading,
      mustChangePassword,
      login,
      logout,
      onPasswordChanged,
      isAuthenticated: Boolean(user),
      tier: user?.tier ?? 0,
      role: user?.role ?? null,
    }),
    [user, loading, mustChangePassword, login, logout, onPasswordChanged]
  );

  if (loading) {
    return (
      <div
        style={{
          minHeight: '100vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <Spinner />
      </div>
    );
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}