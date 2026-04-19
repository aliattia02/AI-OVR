import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import Spinner from '../components/shared/Spinner';
import * as auth from '../services/auth';

const AuthContext = createContext(undefined);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [mustChangePassword, setMustChangePassword] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;

    const restoreSession = async () => {
      try {
        const me = await auth.getMe();
        if (isMounted) {
          setUser(me);
          setMustChangePassword(Boolean(me?.must_change_password));
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
    const result = await auth.login(email, password);
    const loggedInUser = result?.user ?? null;
    setUser(loggedInUser);
    setMustChangePassword(Boolean(result?.must_change_password));
    return result;
  }, []);

  const logout = useCallback(async () => {
    try {
      await auth.logout();
    } finally {
      setUser(null);
      setMustChangePassword(false);
    }
  }, []);

  const markPasswordChanged = useCallback(() => {
    setMustChangePassword(false);
    setUser((prev) => (prev ? { ...prev, must_change_password: false } : prev));
  }, []);

  const value = useMemo(
    () => ({
      user,
      loading,
      login,
      logout,
      mustChangePassword,
      markPasswordChanged,
      isAuthenticated: Boolean(user),
      tier: user?.tier ?? 0,
      role: user?.role ?? null,
    }),
    [user, loading, login, logout, mustChangePassword, markPasswordChanged]
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
