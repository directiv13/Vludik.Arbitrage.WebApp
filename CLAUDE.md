# Arbitrage Platform — Frontend

## Project overview

React/Next.js client for a crypto arbitrage platform. Connects to a Subscriptions Service over WebSocket to stream live order book ticks (bestBid / bestAsk) for a symbol+exchange pair, then computes and charts the entry and exit spread in real time.

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

---

## Repository layout (target)

```
src/
  app/                   # Next.js App Router pages
    page.tsx             # Root page — layout shell
    layout.tsx
  components/
    Header/
      Header.tsx         # Strategy mode toggle (Long+Short / Spot+Short)
    RightBar/
      RightBar.tsx       # Symbol input, future controls
    Chart/
      SpreadChart.tsx    # TradingView Lightweight Charts wrapper
  hooks/
    useSubscription.ts   # WebSocket lifecycle: connect, subscribe, ping, reconnect
  store/
    subscriptionStore.ts # Zustand store — subscription params, ticks, strategy mode
  types/
    ws.ts                # TypeScript types for all WS messages
  lib/
    spread.ts            # Spread computation + chart time-bucketing helpers
```

---

## Strategy modes (Header)

Two buttons in the header select the active strategy. Only one is active at a time.

| Button label | buyExchange.contractType | sellExchange.contractType |
|---|---|---|
| Long+Short | `perpetual` | `perpetual` |
| Spot+Short | `spot` | `perpetual` |

Changing the mode triggers a new `subscribe` message if a symbol is already set.

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
- No server-side auth (MVP).

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

---

## Chart (`SpreadChart.tsx`)

- Uses TradingView Lightweight Charts.
- Two `LineSeries`: green for In spread, red for Out spread.
- X-axis: time (derived from each tick's `timestamp`).
- Y-axis: spread percentage.
- On each new tick pair, compute both spread values and append a point to both series.
- Only append when **both** latestBuyTick and latestSellTick are non-null.

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

- **No `any`** — all WS message shapes must be typed in `src/types/ws.ts`.
- Keep business logic (spread math, WS messaging) out of components. Components read state and render.
- `useSubscription` hook owns the WebSocket instance, ping interval, and reconnect logic. Components never touch `WebSocket` directly.
- Prefer named exports for components.
- Tailwind only for styling — no inline styles, no CSS Modules, no `style` props.

---

## Environment variables

```
NEXT_PUBLIC_WS_URL=ws://localhost:8080/ws
```

---

## Planned future iterations (do not build yet)

- Right bar: Open/Close tabs, exchange dropdowns, enter/exit spread threshold fields.
- Jobs/positions tabs below the chart (active jobs, open/closed positions).
- Auth on the WebSocket endpoint.
- Multiple simultaneous subscriptions.
