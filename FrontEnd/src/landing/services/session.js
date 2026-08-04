// Session check only — this is NOT a second auth implementation. It reads
// the exact localStorage contract written by ../../auth/services/authService.js
// (same keys, same mock/live modes) so a session started on /auth/ is
// recognized here. Both files import TOKEN_KEY/USER_KEY from the shared
// constants module, so they can't drift out of sync.
import { TOKEN_KEY, USER_KEY } from '@shared/constants/session';

const AUTH_MODE = import.meta.env.VITE_AUTH_MODE || 'mock';

function getToken() {
  return localStorage.getItem(TOKEN_KEY);
}

function authHeaders() {
  const token = getToken();
  return token ? { Authorization: `Bearer ${token}` } : {};
}

async function mockFetchCurrentUser() {
  await new Promise((resolve) => setTimeout(resolve, 150));
  const raw = localStorage.getItem(USER_KEY);
  if (!getToken() || !raw) {
    const error = new Error('Not authenticated.');
    error.status = 401;
    throw error;
  }
  return { user: JSON.parse(raw) };
}

async function liveFetchCurrentUser() {
  const response = await fetch('/api/auth/me', { headers: authHeaders() });
  const data = await response.json().catch(() => null);
  if (!response.ok) {
    const error = new Error(data?.error || 'Not authenticated.');
    error.status = response.status;
    throw error;
  }
  return data;
}

export const session = {
  hasStoredToken: () => Boolean(getToken()),
  getStoredUser: () => {
    const raw = localStorage.getItem(USER_KEY);
    return raw ? JSON.parse(raw) : null;
  },
  fetchCurrentUser: () => (AUTH_MODE === 'live' ? liveFetchCurrentUser() : mockFetchCurrentUser()),
  async logout() {
    try {
      if (AUTH_MODE === 'live') {
        await fetch('/api/auth/logout', { method: 'POST', headers: authHeaders() });
      }
    } finally {
      localStorage.removeItem(TOKEN_KEY);
      localStorage.removeItem(USER_KEY);
    }
  }
};

export function signInUrl(redirectPath = '/') {
  return `/auth/?redirect=${encodeURIComponent(redirectPath)}`;
}
