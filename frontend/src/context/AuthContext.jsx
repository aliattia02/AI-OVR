import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import Spinner from '../components/shared/Spinner';
import * as authService from '../services/auth';
import api, { setToken } from '../services/api';

const AuthContext = createContext(undefined);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [mustChangePassword, setMustChangePassword] = useState(false);

  useEffect(() => {
    let isMounted = true;

    const restoreSession = async () => {
      try {
        const me = await authService.getMe();
        if (isMounted) {
          setUser(me);
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    restoreSession();

    return () => {
      isMounted = false;
    };
  }, []);

  const login = useCallback(async (email, password) => {
    const { data } = await api.post('/auth/login', { email, password });
    setToken(data?.access_token ?? null);
    api.setToken?.(data?.access_token ?? null);
    if (data.must_change_password) {
      setMustChangePassword(true);
      window.location.assign('/change-password');
      return null;
    }
    const me = await authService.getMe();
    setUser(me ?? null);
    return me;
  }, []);

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
    window.location.assign('/');
  }, []);

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
