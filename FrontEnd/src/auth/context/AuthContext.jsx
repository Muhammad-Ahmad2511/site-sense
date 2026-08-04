import { createContext, useContext, useEffect, useMemo, useState, useCallback } from 'react';
import { authService } from '../services/authService';

const AuthContext = createContext(null);

export function getRedirectTarget() {
  const params = new URLSearchParams(window.location.search);
  return params.get('redirect') || '/';
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => authService.getStoredUser());
  const [checkingSession, setCheckingSession] = useState(true);

  useEffect(() => {
    let cancelled = false;

    async function verifySession() {
      if (!authService.hasStoredToken()) {
        setCheckingSession(false);
        return;
      }
      try {
        const { user: freshUser } = await authService.fetchCurrentUser();
        if (cancelled) return;
        setUser(freshUser);
        // Already authenticated on load: redirect away from the auth page
        // automatically. Fresh logins/registrations redirect themselves
        // *after* showing their own success animation instead (see
        // AuthPage), so this only fires for an existing valid session.
        window.location.replace(getRedirectTarget());
      } catch {
        // Session expired or invalid — clear it and stay on the auth page.
        if (!cancelled) {
          setUser(null);
          setCheckingSession(false);
        }
      }
    }

    verifySession();
    return () => {
      cancelled = true;
    };
  }, []);

  const login = useCallback(async (credentials) => {
    const { user: loggedInUser } = await authService.login(credentials);
    setUser(loggedInUser);
    return loggedInUser;
  }, []);

  const register = useCallback(async (details) => {
    const { user: newUser } = await authService.register(details);
    setUser(newUser);
    return newUser;
  }, []);

  const forgotPassword = useCallback(async (email) => authService.forgotPassword({ email }), []);

  const logout = useCallback(async () => {
    await authService.logout();
    setUser(null);
  }, []);

  const value = useMemo(
    () => ({ user, checkingSession, login, register, forgotPassword, logout }),
    [user, checkingSession, login, register, forgotPassword, logout]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within an AuthProvider');
  return ctx;
}
