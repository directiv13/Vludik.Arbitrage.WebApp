# Arbitrage Platform — Frontend

## Project overview

React/Next.js client for a crypto arbitrage platform ("Arbor"). Connects to a Subscriptions Service over WebSocket to stream live order book ticks (bestBid / bestAsk) for a symbol+exchange pair, then computes and charts the entry and exit spread in real time. Authentication runs through a server-side BFF (Backend-for-Frontend) — the browser only ever holds an opaque, httpOnly session cookie.

This is a separate repo from the backend.

---

## Tech stack

| Concern | Choice |
|---|---|
| Framework | Next.js (App Router) |
| Language | TypeScript |
| Styling | Tailwind CSS |
| Charting | TradingView Lightweight Charts |
| State management | Zustand |
| WebSocket | Native browser `WebSocket` API, wrapped in a custom hook |
| Session storage | `iron-session` (encrypted, stateless, httpOnly cookie) |
| Sign-in | Google Identity Services via `@react-oauth/google`'s `<GoogleLogin>` |

---

## Repository layout

```
src/
  app/
    page.tsx                    # Root page — layout shell
    layout.tsx                  # Wraps children in <Providers> (GoogleOAuthProvider + AuthProvider)
    login/
      page.tsx                  # /login — Google sign-in, redirects if already authenticated
    api/
      auth/
        google/route.ts         # POST — exchange Google idToken via Identity, create session
        refresh/route.ts        # POST — refresh via Identity, rotate session
        logout/route.ts         # POST — revoke upstream + destroy session
        session/route.ts        # GET  — { isAuthenticated, user } only, never tokens
      gw/[...path]/route.ts     # BFF proxy to API_GATEWAY_URL, attaches access token server-side
      market/[...path]/route.ts # No-auth BFF proxy to API_GATEWAY_URL/market/* (public market data)
  proxy.ts                      # Fast cookie-presence redirect (Next.js 16's renamed middleware.ts)
  components/
    Header/
      Header.tsx                # Strategy mode toggle + BUY/SELL exchange dropdowns
    RightBar/
      RightBar.tsx               # Job config rail: Open/Close · margin · leverage · symbol · spread/size/chunk · Start job
    Chart/
      SpreadChart.tsx            # TradingView Lightweight Charts wrapper (seeds history, then live ticks)
    ui/
      Dropdown.tsx               # Shared select dropdown (optional Fuse.js fuzzy search)
      SegmentedControl.tsx       # Shared pill segmented control (Open/Close, Cross/Isolated, strategy mode)
      NumericField.tsx           # Labelled numeric input with hint + suffix + inline error
    Auth/
      AuthProvider.tsx           # Bootstraps auth state from GET /api/auth/session on mount
      Providers.tsx              # GoogleOAuthProvider > AuthProvider composition root
    Login/
      BrandPanel.tsx             # /login left panel (decorative, ported from design/Login.dc.html)
      SignInCard.tsx              # /login right panel (GoogleLogin button + states)
  hooks/
    useSubscription.ts          # WebSocket lifecycle: connect, subscribe, ping, reconnect
    useAuth.ts                  # Reads authStore, exposes signInWithGoogle()/logout()
  store/
    subscriptionStore.ts        # Zustand store — subscription params, ticks, strategy mode
    jobStore.ts                 # Zustand store — job-config rail form state (raw inputs + submit state)
    authStore.ts                # Zustand store — user, isAuthenticated, loading
  types/
    ws.ts                       # TypeScript types for all WS messages
    auth.ts                     # AuthUser — shared between client and server auth code
    market.ts                   # Venues / spread-history types for the market endpoints
    jobs.ts                     # CreateJobRequest/Response, JobType/MarginType, JobError
  lib/
    spread.ts                   # Spread computation + chart time-bucketing + midPrice helpers
    apiClient.ts                 # apiFetch() — same-origin BFF calls with single-flight refresh
    marketClient.ts              # fetchVenues/fetchCommonSymbols/fetchSpreadHistory — no-auth /api/market/*
    jobForm.ts                   # Pure job-form logic: validateJobForm, buildJobPayload, notional/chunk/base-asset helpers
    jobsClient.ts                # createJob() — POST /api/gw/jobs via apiFetch, throws typed JobError
    server/
      session.ts                 # iron-session wrapper: get/save/destroySession, getAccessToken
      identityClient.ts           # Typed fetch wrapper around IDENTITY_SERVICE_URL
      csrf.ts                     # Origin/Sec-Fetch-Site guard for mutating BFF routes
      gatewayRefresh.ts           # Server-side single-flight refresh coalescing for the gw proxy
```

---

## Strategy modes (Header)

Two buttons in the header select the active strategy. Only one is active at a time.

| Button label | buyExchange.contractType | sellExchange.contractType |
|---|---|---|
| Long+Short | `perpetual` | `perpetual` |
| Spot+Short | `spot` | `perpetual` |

Changing the mode changes each side's contract type, so the set of available venues and
symbols changes too. `setStrategyMode` therefore clears the committed `symbol` (which drives the
WS hook to unsubscribe), the header re-validates/re-picks the exchange pair for the new contract
type, and the rail resets its symbol selection.

---

## Exchange & symbol selection (market data)

Exchange and symbol pickers are driven by three **public, no-auth** market endpoints proxied
through `/api/market/[...path]` (see "Market data endpoints" below). The client uses
`src/lib/marketClient.ts` (plain `fetch`, **not** `apiFetch` — these must not trigger the login
redirect) and the shared `src/components/ui/Dropdown.tsx`.

- **Exchange selection lives in the header** (`Header.tsx`): a BUY dropdown → arrow → SELL dropdown,
  next to the strategy-mode control. Options come from `GET /api/market/venues`, keyed by each
  side's contract type (`contractTypesForMode(strategyMode)`). On load, if no pair is set, the first
  available venue for each side is preselected; no symbol is selected, so nothing subscribes yet.
  Selecting an exchange calls the store's `setBuyExchange` / `setSellExchange`, which **clear the
  committed `symbol`** — this unsubscribes the previous stream and resets the symbol picker.
- **Symbol search lives in the right bar** (`RightBar.tsx`): a filterable `Dropdown` of the symbols
  **common to both exchanges** (set intersection of each side's `GET /api/market/symbols` list, via
  `fetchCommonSymbols`). The filter input uses **Fuse.js** fuzzy matching, entirely client-side (the
  common list is fetched once per pair/mode change). Picking a symbol commits it **immediately** via
  `setSymbol`, which starts the WS subscription — there is no separate Subscribe button (removed when
  the config rail landed). Clearing/invalidating the symbol still happens through the store on an
  exchange or strategy-mode change.

---

## Job creation (right bar)

The config rail (`RightBar.tsx`) lets an authenticated user configure and start a **job** — a
backend process that watches the spread for the selected symbol + exchange pair and opens (or
closes) positions in chunks once the spread crosses a chosen percentage. Creating a job is a single
authenticated `POST`; there is no job list, status stream, or positions table yet.

### Endpoint & payload

The browser never calls the gateway directly, so the client posts to the BFF proxy via
`createJob` (`src/lib/jobsClient.ts`), which calls `apiFetch('jobs', { method: 'POST', … })` →
`POST /api/gw/jobs` (the proxy attaches the bearer token server-side). `createJob` owns all HTTP:
any 2xx is success (body parsed best-effort against `CreateJobResponse`), and any non-2xx (or
network failure) throws a typed `JobError` (`{ message, status? }`) carrying `body.message ??
body.error` or a generic fallback. The 401 → refresh → retry → `/login` path is `apiFetch`'s, not
re-implemented here.

```jsonc
POST /api/gw/jobs
{
  "symbol": "BTCUSDT",                                      // unslashed — BTC/USDT is display-only
  "buyExchange":  { "name": "Binance", "contractType": "perpetual" },
  "sellExchange": { "name": "Bybit",   "contractType": "perpetual" },
  "type": "open",          // open | close
  "spreadPerc": 0.5,       // float, may be negative
  "size": 1.5,             // > 0
  "chunkSize": 0.5,        // > 0, <= size
  "marginType": "cross",   // cross | isolated
  "leverage": 125          // integer, 1 - 500
}
```

All numeric fields are sent as **numbers**. Contract types are **derived** from the strategy mode
(`contractTypesForMode`), not user input — in `spot-short` mode the buy leg is spot, where
`leverage`/`marginType` are meaningless but still sent (the backend may ignore them for a spot leg).
Wire shapes live in `src/types/jobs.ts`.

### Form logic & validation

Payload assembly, validation, and the display helpers (notional, chunk count, base-asset,
percentage formatting) live in `src/lib/jobForm.ts` — pure and unit-testable, kept out of the
component. `validateJobForm(input)` returns `{ valid, errors }`; the raw input strings are kept in
the store (so a user can type `0.` mid-entry) and parsed to numbers only at this boundary.

| Field | Rule |
|---|---|
| `symbol` | committed, non-empty |
| `buyExchange` / `sellExchange` | both set in the store (gates submit; picked in the header) |
| `spreadPerc` | parses as a finite number |
| `size` | finite, `> 0` |
| `chunkSize` | finite, `> 0`, `<= size` |
| `leverage` | integer, `1 <= n <= 500` |

Invalid fields the user has typed into show a red border + inline message; the submit button is
disabled while any rule fails, while no symbol is committed, or while a request is in flight.

### Rail behaviour

Open/Close tabs (`type`) render the **same form and full payload** — only the spread label
(`Enter`/`Exit spread %`), the summary target row (`Opens when ≥`/`Closes when ≤`), and the submit
button (`Start job`+green / `Close positions`+red) differ. The submit button walks
idle → pending (`Starting…`, disabled) → success (`Job created ✓` for ~2s, then idle, **keeping
form values**) → or error (inline red message above the button, button returns to idle for retry).

---

## Spread computation

Ticks arrive independently from two exchanges. The client must hold the latest tick from each exchange and recompute spread on every new tick.

```
In spread  (entry) = (buyExchange.bestAsk / sellExchange.bestBid  - 1) * 100
Out spread (exit)  = (buyExchange.bestBid  / sellExchange.bestAsk - 1) * 100
```

Both values are percentages. These are plotted as two separate line series on the chart:
- **Green line** — In spread
- **Red line** — Out spread

Spread computation lives in `src/lib/spread.ts`, which also owns the chart's time-bucketing helpers (`ChartFrequency`, `bucketStart`, `aggregateToBuckets`) and the hover-tooltip timestamp formatter (`formatTooltipTime`).

---

## WebSocket — Subscriptions Service

### Connection

```
ws://<host>/ws
```

No auth, no subprotocols. One connection = one active subscription at a time.

### Client → Server

**Subscribe**
```json
{
  "action": "subscribe",
  "params": {
    "symbol": "BTCUSDT",
    "buyExchange": { "name": "Binance", "contractType": "spot" },
    "sellExchange": { "name": "Aster",  "contractType": "perpetual" }
  }
}
```

**Replace subscription** — send a new `subscribe` directly; no need to unsubscribe first.

**Unsubscribe** — send when navigating away or clearing the symbol. Params must match active subscription exactly.
```json
{
  "action": "unsubscribe",
  "params": { "symbol": "...", "buyExchange": { ... }, "sellExchange": { ... } }
}
```

**Ping** — must be sent every **30 seconds** or the server closes the connection after 35 s.
```json
{ "action": "ping" }
```
No pong is returned. Fire and forget.

### Server → Client (tick)

The server sends PascalCase keys and capitalized contract-type values, distinct from the camelCase/lowercase shapes used in client → server messages:

```json
{
  "Exchange": "Binance",
  "Symbol": "BTCUSDT",
  "ContractType": "Spot",
  "BestBid": 69000.045,
  "BestAsk": 69001.002,
  "Timestamp": 1782435707437
}
```

`ContractType` is `"Spot"` or `"Perpetual"`. `Timestamp` is epoch milliseconds (number).

To identify which side of the spread a tick belongs to, match `Exchange` + `ContractType` against the active subscription's `buyExchange` / `sellExchange`. `src/types/ws.ts`'s `parseTick()` normalizes this wire shape onto the internal lowerCamelCase `Tick` type used everywhere else in the client.

### Connection rules

- Unexpected close → attempt reconnect, then re-subscribe with the last active params.
- Server does **not** buffer missed ticks. Gaps during disconnect are lost.
- Server does **not** send error frames for bad messages — they are silently dropped.
- No server-side auth on the WS connection itself (see "Planned future iterations") — this is separate from the HTTP-side BFF auth described below, which is already implemented.

---

## Market data endpoints (public, no-auth)

Exchange/symbol discovery and spread history come from three **public** endpoints. They are proxied
through a dedicated BFF route `POST`-free `/api/market/[...path]` (`src/app/api/market/[...path]/route.ts`)
that forwards `GET /api/market/<path>` → `${API_GATEWAY_URL}/market/<path>` **without** a session or
Bearer token. This is deliberately separate from `/api/gw/[...path]`, which hard-requires a login
session and whose `apiFetch` client redirects to `/login` on 401 — wrong for anonymous market data.
The route keeps `API_GATEWAY_URL` server-only (the browser only ever calls same-origin `/api/market/*`).

The client wrapper is `src/lib/marketClient.ts` (plain `fetch`, never `apiFetch`):

| Endpoint | Response | Client helper |
|---|---|---|
| `GET /api/market/venues` | `{ spot: string[], perpetual: string[] }` | `fetchVenues()` |
| `GET /api/market/symbols?exchange=&contractType=` | `string[]` | `fetchSymbols()`, `fetchCommonSymbols()` (intersection) |
| `GET /api/market/history-spread?buyExchange=&buyContractType=&sellExchange=&sellContractType=&symbol=` | `{ data: { timestamp /* unix s */, in, out }[] }` | `fetchSpreadHistory()` (maps to `SpreadPoint`) |

`contractType` values are lowercase `spot` / `perpetual` (matching the internal `ContractType`), derived
per side from `strategyMode` via `contractTypesForMode`.

---

## Authentication (BFF)

All tokens live **server-side**. The browser only ever holds an opaque, httpOnly session cookie (`arbor_session` by default) — never an access token, refresh token, or ID token.

### Two upstreams, one BFF

- **Identity service** (`IDENTITY_SERVICE_URL`) — called directly by the BFF, only for `/auth/*`. Never called from the browser.
- **API Gateway** (`API_GATEWAY_URL`) — every other backend call (jobs, subscriptions, users, credentials, market data, etc.) goes through the BFF's proxy at `/api/gw/[...path]`, which attaches `Authorization: Bearer <accessToken>` server-side.

The browser calls **same-origin `/api/*` routes only**. It never talks to Identity or the Gateway directly.

### Session (`src/lib/server/session.ts`)

`iron-session`, cookie-only (not a session-id + store — the current access/refresh token pair comfortably fits the ~4KB cookie budget). `SessionData` is `{ accessToken?, refreshToken?, user?, accessTokenExpiresAt? }`, sealed with `SESSION_SECRET`. All reads/writes go through five exported functions (`getSession`, `saveSession`, `destroySession`, `getAccessToken`, `isAuthenticated`) — if the cookie ever needs to become an opaque session-id backed by a store instead, this file is the only one that changes.

### BFF routes

| Route | Purpose |
|---|---|
| `POST /api/auth/google` | Body `{ idToken }` (the Google credential) → Identity `/auth/google` → saves session → responds with `{ user }` only |
| `POST /api/auth/refresh` | Uses the session's refresh token → Identity `/auth/refresh` → rotates session |
| `POST /api/auth/logout` | Revokes the refresh token upstream, then destroys the session |
| `GET /api/auth/session` | `{ isAuthenticated, user }` — used by `AuthProvider` to bootstrap client state |
| `GET/POST/PUT/PATCH/DELETE /api/gw/[...path]` | Proxies to `API_GATEWAY_URL`, attaching the access token |

`src/lib/server/identityClient.ts`'s `parseIdentityAuthResult()` normalizes Identity's response the same way `parseTick()` normalizes WS ticks — camelCase field names are assumed but unverified against the real Identity service; that function is the one place to fix if the real shape differs.

### Transparent refresh (single-flight)

Identity is assumed to **rotate refresh tokens**, so a burst of parallel 401s must not each fire their own refresh (the first would invalidate the rest). Two layers:

- **Client** (`src/lib/apiClient.ts`'s `apiFetch`) — module-level `refreshPromise` singleton coalesces concurrent 401s into one `/api/auth/refresh` call; retries the original request once regardless of refresh outcome (covers a concurrent refresh from another tab already having rotated the cookie); only redirects to `/login` if that retry is still 401.
- **Server** (`src/lib/server/gatewayRefresh.ts`'s `coordinatedRefresh`) — defense-in-depth `Map` keyed by a hash of the current refresh token, coalescing concurrent 401s within one server process. Not a cross-instance guarantee under multi-instance/serverless deployment — the client-side layer is primary.

Both cap at **one refresh + one retry**, never loop.

### Google Sign-In

`@react-oauth/google`'s `<GoogleLogin onSuccess>` only — **never** `useGoogleLogin` (it returns an OAuth access token, not the ID token the BFF needs). `credentialResponse.credential` is the ID token, sent to `POST /api/auth/google`, never to Identity directly.

### Route protection (`src/proxy.ts`)

Next.js 16 renamed the `middleware.ts` file convention to `proxy.ts` (exported function `proxy`, not `middleware`) — `middleware.ts` still works but is deprecated. `proxy.ts` does a **fast cookie-presence check only** (`request.cookies.has(...)`), redirecting unauthenticated requests to `/login` and authenticated requests away from `/login`. It does **not** unseal or validate the cookie — `next/headers`' `cookies()` (which `getIronSession` needs) isn't available outside Server Components/Route Handlers. Authoritative validation happens in route handlers and via the gateway rejecting a stale/forged token, which flows through the refresh-or-destroy logic above.

### CSRF

`src/lib/server/csrf.ts`'s `csrfGuard(request)` checks `Sec-Fetch-Site`/`Origin` against the app's own origin and is the first line of every mutating route handler (all of `/api/auth/*`'s POSTs, and the non-GET methods of `/api/gw/[...path]`). Combined with the cookie's `sameSite: 'lax'`.

---

## Zustand store (`subscriptionStore.ts`)

Tracks:

```ts
{
  strategyMode: 'long-short' | 'spot-short'   // active header button
  symbol: string                               // e.g. "BTCUSDT"
  buyExchangeName: string                      // e.g. "Binance"
  sellExchangeName: string                     // e.g. "Aster"
  latestBuyTick: Tick | null
  latestSellTick: Tick | null
}
```

Actions: `setStrategyMode`, `setSymbol`, `setExchanges`, `setTick`.

Chart data (the rolling time series for the two spread lines) is held in local component state inside `SpreadChart.tsx`, not in the global store. The chart updates by reacting to `latestBuyTick` / `latestSellTick` via a Zustand selector.

### `jobStore.ts` — config-rail form state

A second store holds **only** the job-config rail's form state (symbol/exchange/strategy stay in
`subscriptionStore` and are read via selectors; derived values like notional/chunk-count/validity
are computed in helpers, never stored). Numeric inputs are kept as raw strings so a user can type
`0.` mid-entry — they're parsed only at the validate/submit boundary.

```ts
{
  type: 'open' | 'close'                          // Open/Close tab
  marginType: 'cross' | 'isolated'
  leverage: number                                // 1–500, default 10
  size: string                                    // raw input
  chunkSize: string                               // raw input
  spreadPerc: string                              // raw input
  submitState: 'idle' | 'pending' | 'success' | 'error'
  submitError: string | null
}
```

Actions: `setType`, `setMarginType`, `setLeverage`, `setSize`, `setChunkSize`, `setSpreadPerc`,
`setSubmitState`, `reset`.

---

## Chart (`SpreadChart.tsx`)

- Uses TradingView Lightweight Charts.
- Two `LineSeries`: green for In spread, red for Out spread.
- X-axis: time (derived from each tick's `timestamp`).
- Y-axis: spread percentage.
- On each new tick pair, compute both spread values and append a point to both series.
- Only append when **both** latestBuyTick and latestSellTick are non-null.

### History seeding

When the active subscription changes (`symbol` / exchanges / `strategyMode`), the chart first clears
(see "Clearing"), then seeds itself with historical spread from `GET /api/market/history-spread` via
`fetchSpreadHistory` (already mapped onto the `SpreadPoint` shape, unix-seconds time). The fetched
points become the local raw-point buffer, aggregated to the current frequency with `aggregateToBuckets`
and drawn via `setData`; live ticks then append on top. The fetch is guarded by an `AbortController` +
stale flag so a rapid re-subscribe can't seed with a late response, and any live points that arrive
during the fetch (newer than the last history bucket) are preserved when merging.

### Point frequency (1m / 5m / 15m / 1h)

A segmented control in the chart header lets the user pick the point frequency. The line still updates in real time: each tick moves the value of the *currently open* time bucket (`bucketStart` floors the tick's time down to the bucket size), and a new fixed point is only created once a bucket boundary is crossed — the same model as a live-forming candle. The component keeps a local buffer of every raw tick-pair point since the last clear (`SpreadPoint[]`); switching frequency re-aggregates that whole buffer via `aggregateToBuckets` and redraws both series with `setData`, so the entire visible history reflects the new resolution, not just future points.

### Hover tooltip

Hovering over the chart shows a custom tooltip (lightweight-charts has no built-in multi-series tooltip) with the hovered bucket's timestamp and both spread values, e.g.:
```
Jun 26, 20:24:30
In: 0.5%
Out: -0.1%
```
Implemented via `chart.subscribeCrosshairMove`, reading `param.seriesData` for both series. Hidden when the cursor leaves the plot area or sits over a time with no data.

### Clearing

The chart fully clears (both series + the local raw-point buffer) whenever `symbol`, `buyExchangeName`, `sellExchangeName`, or `strategyMode` (the proxy for contractType) changes, so a new subscription never visually blends with the previous one's data.

---

## Coding conventions

- **No `any`** — all WS message shapes must be typed in `src/types/ws.ts`; all auth/session shapes in `src/types/auth.ts` and `src/lib/server/session.ts`.
- Keep business logic (spread math, WS messaging, auth/session handling) out of components. Components read state and render.
- `useSubscription` hook owns the WebSocket instance, ping interval, and reconnect logic. Components never touch `WebSocket` directly.
- Client components/hooks call the backend via `apiFetch()` from `src/lib/apiClient.ts` (same-origin `/api/gw/*`) — never `fetch()` a gateway path directly, and never call Identity or the Gateway from the browser. The one exception is `useAuth.ts`'s own calls to `/api/auth/*`, which must use plain `fetch()`, not `apiFetch`, to avoid recursing into the refresh logic.
- Never store tokens in `localStorage`, `sessionStorage`, or a JS-readable cookie — the session cookie is the only place tokens live, and it's httpOnly.
- Prefer named exports for components.
- Tailwind only for styling — no inline styles, no CSS Modules, no `style` props.

---

## Environment variables

```
# WebSocket (Subscriptions Service)
NEXT_PUBLIC_WS_URL=ws://localhost:8080/ws

# Google OAuth (public — used by GoogleOAuthProvider in the browser)
NEXT_PUBLIC_GOOGLE_CLIENT_ID=

# BFF upstreams — server-only, never exposed to the browser
IDENTITY_SERVICE_URL=http://localhost:5001
API_GATEWAY_URL=http://localhost:5000

# Session — server-only
SESSION_SECRET=            # >= 32 characters
SESSION_COOKIE_NAME=arbor_session
# SESSION_TTL_SECONDS=604800
```

See `.env.local.example` for a copy-pasteable template.

---

## Planned future iterations (do not build yet)

- Jobs/positions tabs below the chart (active jobs, open/closed positions).
- Auth on the WebSocket endpoint (HTTP-side auth via the BFF already exists — see "Authentication (BFF)" above; WS ticks are still unauthenticated).
- Multiple simultaneous subscriptions.
