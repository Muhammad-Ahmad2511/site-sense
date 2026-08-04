# Deployment — Frontend on Vercel, Backend on Railway

This is a monorepo. Each platform is pointed at one subfolder as its
**Root Directory**; nothing else in the repo needs to change.

No application code was modified for this. The only additions are:

- `BackEnd/railway.json` — tells Railway to build with the existing
  `BackEnd/Dockerfile` (which already runs
  `playwright install --with-deps chromium`, so the crawler works in
  production exactly as it does locally).
- `FrontEnd/vercel.json` — a Vercel-only build config plus a rewrite that
  proxies `/api/*` on the Vercel domain through to the Railway backend.
- `FrontEnd/package.json` — one new script, `build:vercel`, that runs the
  existing build with `--outDir dist` instead of `../BackEnd/public`. The
  original `build` script (used for the local/monolith workflow described
  in the root `README.md`) is untouched.

Because `/api/*` is proxied through Vercel rather than called
cross-origin, the browser always sees same-origin requests. **No CORS
changes are needed on the backend**, and every existing `fetch('/api/...')`
call in the frontend source keeps working with zero edits.

## 1. Deploy the backend first (Railway)

1. Create a new Railway service from this repo.
2. Set **Root Directory** to `BackEnd`.
3. Railway will detect `railway.json` and build with `BackEnd/Dockerfile`
   (Nixpacks is not used, so no extra Playwright system-dependency setup is
   needed — the Dockerfile already installs them).
4. Add environment variables from `BackEnd/.env.example` in the Railway
   dashboard (Variables tab) — at minimum you can deploy with none set
   (the audit works without AI). To enable AI explanations, set
   `OPENAI_API_KEY` (and `OPENAI_MODEL` if you don't want the default).
   Do **not** commit a `.env` file — it's already gitignored.
5. Railway injects `PORT` automatically; `server.js` already reads
   `process.env.PORT`, so nothing to configure there.
6. Deploy, then copy the generated public URL, e.g.
   `https://your-service.up.railway.app`.

## 2. Point the frontend at that backend

Edit `FrontEnd/vercel.json` and replace the placeholder with the Railway
URL from step 1:

```json
{ "source": "/api/:path*", "destination": "https://your-service.up.railway.app/api/:path*" }
```

Commit that change.

## 3. Deploy the frontend (Vercel)

1. Create a new Vercel project from this repo.
2. Set **Root Directory** to `FrontEnd`.
3. Vercel will read `vercel.json` for the build command
   (`npm run build:vercel`) and output directory (`dist`) — no manual
   dashboard configuration needed, but if prompted, Framework Preset
   should be "Other".
4. Deploy.

`/` serves the landing app, `/auth` serves the auth app (same two pages as
today, same asset paths, same `theme-init.js` — the multi-page Vite build
is unchanged, only its output location differs between the two build
scripts).

## Notes

- Local development is unaffected: `npm run dev` (Vite proxy to
  `localhost:3000`) and the original `npm run build` +
  `cd BackEnd && npm start` monolith flow both work exactly as before.
- If you ever need to call the Railway API directly from a different
  origin (bypassing the Vercel proxy), you'll need to add CORS handling in
  `server.js` at that point — intentionally not added now since it isn't
  needed for this deployment shape and the task asked for the minimum
  change set.
- Auth stays in its default mock mode in production unless you set
  `VITE_AUTH_MODE=live` in Vercel — the backend doesn't implement the
  `/api/auth/*` routes yet (see `FrontEnd/README.md`), so leave it as
  `mock` until it does.
