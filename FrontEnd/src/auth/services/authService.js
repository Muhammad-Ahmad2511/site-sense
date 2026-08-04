// =============================================================================
// AUTH SERVICE — PLACEHOLDER BACKEND CONTRACT
// =============================================================================
// ClearSite Audit's Express server (../../server.js) currently has NO
// authentication routes, JWT, sessions, or user model. Per project
// instructions, this frontend must not invent or modify backend APIs.
//
// This file defines the exact contract the real backend should implement,
// and ships a MOCK implementation (in-memory, localStorage-backed) so the
// UI is fully demoable today. Flip AUTH_MODE to 'live' once the backend
// team implements the routes below — no other frontend code needs to change.
//
// EXPECTED ENDPOINTS (implement in server.js, JSON in/out, same shape as
// the audit tool's existing routes):
//
//   POST /api/auth/login
//     body:    { email: string, password: string, rememberMe: boolean }
//     success: 200 { user: { id, name, email }, token: string }
//     error:   401 { error: string }   (invalid credentials)
//              400 { error: string, fields?: { email?: string, password?: string } }
//
//   POST /api/auth/register
//     body:    { name: string, email: string, password: string }
//     success: 201 { user: { id, name, email }, token: string }
//     error:   409 { error: string }   (email already in use)
//              400 { error: string, fields?: {...} }
//
//   POST /api/auth/forgot-password
//     body:    { email: string }
//     success: 200 { message: string }   (always 200 to avoid user enumeration)
//     error:   400 { error: string }
//
//   GET /api/auth/me
//     header:  Authorization: Bearer <token>   (or an httpOnly session cookie —
//              see TOKEN STORAGE note below)
//     success: 200 { user: { id, name, email } }
//     error:   401 { error: string }
//
//   POST /api/auth/logout
//     success: 200 { message: string }
//
// TOKEN STORAGE:
// The real backend's session strategy (JWT bearer token vs. httpOnly cookie)
// is not yet decided. This mock stores a token in localStorage and sends it
// as an Authorization header, which is the most common bearer-token pattern.
// If the backend instead sets an httpOnly cookie, delete the localStorage
// calls below and add `credentials: 'include'` to each fetch — no other
// frontend file needs to change, since everything goes through this service.
// =============================================================================

import { TOKEN_KEY, USER_KEY } from '@shared/constants/session';

const AUTH_MODE = import.meta.env.VITE_AUTH_MODE || 'mock'; // 'mock' | 'live'

function getToken() {
  return localStorage.getItem(TOKEN_KEY);
}

function setSession(token, user) {
  localStorage.setItem(TOKEN_KEY, token);
  localStorage.setItem(USER_KEY, JSON.stringify(user));
}

function clearSession() {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(USER_KEY);
}

function authHeaders() {
  const token = getToken();
  return token ? { Authorization: `Bearer ${token}` } : {};
}

async function liveRequest(path, options = {}) {
  const response = await fetch(`/api/auth${path}`, {
    method: options.method || 'GET',
    headers: {
      'Content-Type': 'application/json',
      ...authHeaders(),
      ...(options.headers || {})
    },
    body: options.body ? JSON.stringify(options.body) : undefined
  });

  let data = null;
  try {
    data = await response.json();
  } catch {
    // no body
  }

  if (!response.ok) {
    const error = new Error(data?.error || 'Something went wrong. Please try again.');
    error.status = response.status;
    error.fields = data?.fields;
    throw error;
  }

  return data;
}

// ---------------------------------------------------------------------------
// MOCK implementation — in-memory "database" seeded with one demo user so
// the flow can be exercised end to end without a backend.
// ---------------------------------------------------------------------------
const MOCK_LATENCY = 700;
const mockUsers = new Map([
  ['demo@site-sense.app', { id: 'usr_demo', name: 'Demo User', email: 'demo@site-sense.app', password: 'Password1!' }]
]);

function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function fakeToken(email) {
  return `mock.${btoa(email)}.${Date.now()}`;
}

async function mockLogin({ email, password }) {
  await delay(MOCK_LATENCY);
  const record = mockUsers.get(email.toLowerCase());
  if (!record || record.password !== password) {
    const error = new Error('Incorrect email or password.');
    error.status = 401;
    throw error;
  }
  const user = { id: record.id, name: record.name, email: record.email };
  return { user, token: fakeToken(email) };
}

async function mockRegister({ name, email, password }) {
  await delay(MOCK_LATENCY);
  if (mockUsers.has(email.toLowerCase())) {
    const error = new Error('An account with that email already exists.');
    error.status = 409;
    throw error;
  }
  const user = { id: `usr_${Date.now()}`, name, email };
  mockUsers.set(email.toLowerCase(), { ...user, password });
  return { user, token: fakeToken(email) };
}

async function mockForgotPassword({ email }) {
  await delay(MOCK_LATENCY);
  return { message: `If an account exists for ${email}, a reset link has been sent.` };
}

async function mockMe() {
  await delay(200);
  const token = getToken();
  const raw = localStorage.getItem(USER_KEY);
  if (!token || !raw) {
    const error = new Error('Not authenticated.');
    error.status = 401;
    throw error;
  }
  return { user: JSON.parse(raw) };
}

async function mockLogout() {
  await delay(200);
  return { message: 'Logged out.' };
}

// ---------------------------------------------------------------------------
// Public API — identical surface regardless of AUTH_MODE.
// ---------------------------------------------------------------------------
export const authService = {
  mode: AUTH_MODE,

  async login({ email, password, rememberMe }) {
    const data =
      AUTH_MODE === 'live'
        ? await liveRequest('/login', { method: 'POST', body: { email, password, rememberMe } })
        : await mockLogin({ email, password });
    setSession(data.token, data.user);
    return data;
  },

  async register({ name, email, password }) {
    const data =
      AUTH_MODE === 'live'
        ? await liveRequest('/register', { method: 'POST', body: { name, email, password } })
        : await mockRegister({ name, email, password });
    setSession(data.token, data.user);
    return data;
  },

  async forgotPassword({ email }) {
    return AUTH_MODE === 'live'
      ? liveRequest('/forgot-password', { method: 'POST', body: { email } })
      : mockForgotPassword({ email });
  },

  async fetchCurrentUser() {
    return AUTH_MODE === 'live' ? liveRequest('/me') : mockMe();
  },

  async logout() {
    try {
      await (AUTH_MODE === 'live' ? liveRequest('/logout', { method: 'POST' }) : mockLogout());
    } finally {
      clearSession();
    }
  },

  getStoredUser() {
    const raw = localStorage.getItem(USER_KEY);
    return raw ? JSON.parse(raw) : null;
  },

  hasStoredToken() {
    return Boolean(getToken());
  }
};
