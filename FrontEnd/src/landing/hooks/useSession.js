import { useEffect, useState, useCallback } from 'react';
import { session } from '../services/session';

// The audit tool is public — running an audit never requires an account.
// This hook only resolves *optional* session state (to show "Sign out" vs
// "Sign in" in the nav) and never redirects or blocks rendering. Reserved
// for future premium features that may require login.
export function useSession() {
  const [user, setUser] = useState(null);

  useEffect(() => {
    let cancelled = false;

    async function resolve() {
      if (!session.hasStoredToken()) return;
      try {
        const { user: freshUser } = await session.fetchCurrentUser();
        if (!cancelled) setUser(freshUser);
      } catch {
        // Stale/expired token — clear it quietly, stay a guest.
        await session.logout().catch(() => {});
      }
    }

    resolve();
    return () => {
      cancelled = true;
    };
  }, []);

  const logout = useCallback(async () => {
    await session.logout();
    setUser(null);
  }, []);

  return { user, logout };
}
