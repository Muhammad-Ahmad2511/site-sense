# ABladUX Frontend

One Vite + React workspace containing both frontend apps:

- **`src/landing`** — the marketing site plus the audit tool itself, served
  at `/`.
- **`src/auth`** — Sign In / Sign Up / Forgot Password, served at `/auth`.
- **`src/shared`** — the genuinely duplicated code extracted from both:
  `components/AnimatedBackground.jsx`, `constants/session.js` (the
  `TOKEN_KEY`/`USER_KEY` localStorage contract), `styles/theme.css` (design
  tokens + `.glass-*` utility classes).

One `package.json`, one `node_modules`, one `vite.config.ts` building both
pages in a single multi-page pass into `../BackEnd/public` — the existing
Express static middleware serves it as-is, **zero backend changes**.

## Commands

```bash
npm install
npm run dev      # one dev server on :5175 — landing at /, auth at /auth/
npm run build     # outputs to ../BackEnd/public (served once you run the backend)
```

## Import aliases

Within an app, imports stay relative (`./components/...`) — only imports
that cross into shared code use an alias, configured identically in
`vite.config.ts` and `tsconfig.json`:

- `@shared/*` → `src/shared/*`
- `@landing/*` → `src/landing/*`
- `@auth/*` → `src/auth/*`

## There is no backend auth yet

`server.js` has no login/register/session/JWT code at all. Per the original
task constraints, this frontend doesn't add any — it ships:

1. A fully-built UI (Sign In, Sign Up, Forgot Password, validation, password
   strength, loading/success/error states, responsive glassmorphism design).
2. A service layer (`src/auth/services/authService.js`) that already speaks
   the exact contract the backend should implement.
3. A **mock mode** (default) that fakes the backend in-memory so the whole
   flow is demoable today: try `demo@abladux.com` / `Password1!` on `/auth`.

### Switching from mock to a real backend

Once the backend implements the routes below, set `VITE_AUTH_MODE=live`
(e.g. in a `.env` file in this folder) and rebuild. No other frontend file
needs to change — every page/component goes through `authService`.

| Endpoint                     | Method | Body                                              | Success                                  | Error                                                              |
| ----------------------------- | ------ | -------------------------------------------------- | ----------------------------------------- | -------------------------------------------------------------------- |
| `/api/auth/login`             | POST   | `{ email, password, rememberMe }`                 | `200 { user: {id,name,email}, token }`    | `401 { error }` invalid creds · `400 { error, fields? }`             |
| `/api/auth/register`          | POST   | `{ name, email, password }`                        | `201 { user: {id,name,email}, token }`    | `409 { error }` email taken · `400 { error, fields? }`               |
| `/api/auth/forgot-password`   | POST   | `{ email }`                                        | `200 { message }` (always 200, no enumeration) | `400 { error }`                                                 |
| `/api/auth/me`                | GET    | —                                                   | `200 { user: {id,name,email} }`           | `401 { error }`                                                     |
| `/api/auth/logout`            | POST   | —                                                   | `200 { message }`                         | —                                                                    |

**Token storage is undecided** — the mock defaults to a bearer token in
`localStorage` (`Authorization: Bearer <token>` header, sent by
`authHeaders()` in `authService.js`). If the backend instead sets an
httpOnly session cookie, update `liveRequest()` in that same file to add
`credentials: 'include'` and drop the `Authorization` header — that's the
only place that needs to change.

## Integration points

- **Redirect target**: after login/signup, or when an already-authenticated
  user lands on `/auth`, the app redirects to `?redirect=<path>` if present,
  else `/` (the landing app, which hosts the audit tool directly). Link to
  `/auth?redirect=/some/page` to preserve an intended destination when
  bouncing an expired session back to sign-in — this is exactly what
  `src/landing/services/session.js` does when its own session check fails.
- **Theme**: both pages load `/theme-init.js` (in `public/`, copied verbatim
  into every build by Vite) and the same `[data-theme]` convention, so
  dark/light mode stays consistent across `/` and `/auth`.
- **CSP**: `server.js`'s Helmet config is `script-src 'self'` / `style-src
  'self'` with no `unsafe-inline`. Nothing here relies on inline `<script>`
  or `style=""` — keep it that way if you extend it.
- **Social login**: intentionally omitted — the backend doesn't support
  OAuth yet.
