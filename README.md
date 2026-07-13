# Arbor — Arbitrage Terminal (Frontend)

Next.js (App Router) client for a crypto arbitrage platform. Streams live order book ticks over
WebSocket from a Subscriptions Service, computes entry/exit spread in real time, and charts it
with TradingView Lightweight Charts (seeded with historical spread on each subscription).
Exchanges are chosen from a live venue list in the header and symbols from a filterable, fuzzy-search
dropdown of the symbols common to both exchanges. Authentication runs through a server-side BFF
(Backend-for-Frontend) — the browser only ever holds an opaque, httpOnly session cookie; Google
sign-in tokens never touch client-side storage.

Exchange/symbol discovery and spread history use three **public, no-auth** market endpoints
(`/api/market/venues`, `/api/market/symbols`, `/api/market/history-spread`), proxied server-side to
`API_GATEWAY_URL/market/*` so the browser only ever calls same-origin routes.

See [CLAUDE.md](./CLAUDE.md) for the full architecture: the WebSocket protocol, spread math, the
market data endpoints, the BFF's routes and refresh/CSRF handling, and coding conventions.

## Prerequisites

- Node.js 20+
- A running Subscriptions Service (WebSocket), Identity service, and API Gateway to point at (or
  local stubs) — see [Environment variables](#environment-variables) below.

## Getting started

```bash
cp .env.local.example .env.local
# fill in NEXT_PUBLIC_GOOGLE_CLIENT_ID, IDENTITY_SERVICE_URL, API_GATEWAY_URL, SESSION_SECRET
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000). You'll be redirected to `/login` until you
sign in with Google.

## Environment variables

| Variable | Exposed to browser? | Purpose |
|---|---|---|
| `NEXT_PUBLIC_WS_URL` | Yes | Subscriptions Service WebSocket endpoint |
| `NEXT_PUBLIC_GOOGLE_CLIENT_ID` | Yes | Google Identity Services client ID for `<GoogleLogin>` |
| `IDENTITY_SERVICE_URL` | No | Identity service base URL — BFF only, for `/auth/*` |
| `API_GATEWAY_URL` | No | API Gateway base URL — BFF proxy target for everything else |
| `SESSION_SECRET` | No | `iron-session` encryption key, >= 32 characters |
| `SESSION_COOKIE_NAME` | No | Session cookie name (defaults to `arbor_session`) |
| `SESSION_TTL_SECONDS` | No | Optional session TTL override |

Copy `.env.local.example` to `.env.local` and fill in real values. Server-only variables (no
`NEXT_PUBLIC_` prefix) are never sent to the browser and must not be set as Docker build args —
they're read at request time.

## Scripts

```bash
npm run dev     # start the dev server
npm run build   # production build (Next.js standalone output)
npm run start   # run the production build with `next start`
npm run lint    # eslint
npx tsc --noEmit  # type-check
```

## Docker

```bash
docker compose up          # dev target, hot reload, mounts the repo into the container
docker build --target prod --build-arg NEXT_PUBLIC_WS_URL=... \
  --build-arg NEXT_PUBLIC_GOOGLE_CLIENT_ID=... -t arbor-web .
docker run -p 3000:3000 \
  -e IDENTITY_SERVICE_URL=... -e API_GATEWAY_URL=... -e SESSION_SECRET=... \
  arbor-web
```

The `prod` stage builds Next.js's `output: "standalone"` bundle and runs it directly with
`node server.js` (no nginx) — the BFF's Route Handlers, `proxy.ts`, and session cookies all need a
live Node.js process.

## Project structure

See the "Repository layout" section in [CLAUDE.md](./CLAUDE.md) for the full annotated tree.
