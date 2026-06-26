# Handoff: Crypto Arbitrage Terminal

## Overview
A single-screen desktop trading terminal for running **cross-exchange spread-arbitrage jobs**. A "job" is a backend task that opens hedged positions (long on the buy-exchange, short on the sell-exchange) once the live spread rises above an **Enter %** threshold, and closes them once the spread falls below an **Exit %** threshold. The screen lets a trader configure and launch a job, watch the live spread + funding on a chart, and monitor active jobs / open positions / closed positions.

## About the Design Files
The file in this bundle (`Arbitrage Terminal.dc.html`) is a **design reference created in HTML** — a working prototype showing the intended look, layout, and interactions. It is **not production code to ship directly.** The task is to **recreate this design in the target codebase's existing environment** (React, Vue, Svelte, etc.) using its established components, state, and data layer. If no frontend environment exists yet, pick the most appropriate framework and implement there. Wire the placeholder data and the chart to real exchange feeds.

> Note: the prototype is built as a self-contained HTML "Design Component" with an embedded mini-runtime. **Ignore the runtime wrapper** — only the markup structure, styling, layout, and interaction logic are meant to be reproduced.

## Fidelity
**High-fidelity (hifi).** Final colors, typography, spacing, and interactions are intentional. Recreate the UI pixel-faithfully using the codebase's existing libraries. The one external dependency is the chart (see Assets).

---

## Layout (single screen)

Target width: **1280px desktop** (degrades gracefully narrower; tables gain horizontal scroll below ~1180px). Full viewport height, no page scroll — internal panels scroll.

```
┌────────────────────────────────────────────────────────────────────┐
│ HEADER  (54px tall)                                                  │
│ logo · [Long+Short | Spot+Short] · BUY▾ → SELL▾ ·· layout · equity  │
├──────────────────────────────────────────────┬─────────────────────┤
│ MAIN COLUMN (flex:1)                          │ CONFIG RAIL (336px) │
│ ┌──────────────────────────────────────────┐ │ ┌─────────────────┐ │
│ │ CHART PANEL (flex 1.45)                   │ │ │ [Open | Close]  │ │
│ │  legend + timeframe · TradingView chart   │ │ │ Margin type     │ │
│ └──────────────────────────────────────────┘ │ │ Leverage        │ │
│ ┌──────────────────────────────────────────┐ │ │ Symbol ▾        │ │
│ │ JOBS PANEL (flex 1)                       │ │ │ Spread %        │ │
│ │  tabs: Active jobs/Open pos/Closed pos    │ │ │ Size · Chunk    │ │
│ │  data table (horizontal scroll if narrow) │ │ │ summary box     │ │
│ └──────────────────────────────────────────┘ │ │ ───── Start ──── │ │
│                                               │ └─────────────────┘ │
└──────────────────────────────────────────────┴─────────────────────┘
```

- Body: `display:flex; gap:10px; padding:10px`. Main column `flex:1; min-width:0`, config rail `width:336px; flex:none`.
- Main column is a vertical flex (`gap:10px`): chart panel `flex:1.45`, jobs panel `flex:1`, both `min-height:0`.
- **Layout variation:** a header toggle switches the rail between right (default) and left. Implemented by setting the body to `flex-direction: row-reverse` (rail is the last DOM child, so it moves to the left). The chart must re-measure/resize on this change.
- All panels: `background:#0f1118; border:1px solid #242a39; border-radius:12px; overflow:hidden`.

---

## Screens / Components

### Header (height 54px, `background:#0f1118`, bottom border `#242a39`, `padding:0 16px`, flex, `gap:18px`)
- **Logo**: 27×27 rounded-7px gradient tile `linear-gradient(145deg,#8b73ff,#6a4dff)` with a white double-arrow glyph; wordmark "Arbor" 15px/700; pill "ARB" 9.5px/600 violet on `rgba(123,97,255,.14)`.
- **Mode segmented control** (`background:#13161f`, border `#242a39`, radius 9, 3px pad): two buttons **"Long + Short"** / **"Spot + Short"**. Active = violet fill `#7b61ff`, white text, shadow `0 2px 10px rgba(123,97,255,.35)`. Inactive = transparent, text `#969cab`. 12px/600.
- **Exchange route**: two dropdown buttons separated by a `→` arrow icon (`#5d6473`). Left button label "BUY" (9px/600 green `#00d18f`) + exchange name; right "SELL" (red `#ff5266`) + exchange name. Button style: `background:#13161f; border:1px solid #242a39; radius:8; padding:7px 11px`. Clicking opens a 160px dropdown menu (see Dropdown pattern). Exchanges: **Binance, Bybit, OKX, Gate, Kraken, KuCoin.**
- **Spacer** (`flex:1`).
- **Layout toggle** segmented control: two icon buttons (rail-right / rail-left), active = violet fill.
- **Equity readout**: label "EQUITY" 9.5px `#5d6473`; value `$128,540.22` 13px mono, right-aligned, left border divider.
- **Avatar**: 31px circle gradient `#3a4150→#222733`, initials "AK".

### Chart panel
- **Header strip** (`padding:11px 15px`, bottom border `#191e2a`, flex `gap:20px`):
  - Symbol 14px/600 + route `Binance → Bybit` 11px `#5d6473`.
  - "SPREAD" label 10px `#5d6473` + big live value 19px/600 mono green `#00d18f`.
  - Legend: green swatch "In" + value, red swatch "Out" + value (12px mono).
  - Spacer, then **timeframe** segmented chips `1m / 5m / 15m / 1h` (mono 11px, active violet).
- **Chart body** (`flex:1; position:relative`):
  - **TradingView Lightweight Charts** instance, dark theme.
  - Two **line series on the right price scale** (top region, `scaleMargins {top:0.06, bottom:0.34}`): **In = green `#00d18f`**, **Out = red `#ff5266`**, lineWidth 2, custom price format `v.toFixed(3)+'%'`.
  - Two **horizontal price lines** drawn on the series: **Enter** (green, dashed, `lineStyle:2`) at the Enter% value, **Exit** (red, dashed) at the Exit% value. These move when the form fields change.
  - Two **funding line series on a separate "funding" price scale** pinned to the bottom (`scaleMargins {top:0.76, bottom:0.02}`): buy-exchange funding **amber `#f0a830`**, sell-exchange funding **blue `#5b8def`**, lineWidth 1.
  - Bottom-left overlay legend (10.5px): "Funding {buyEx}" + value, "Funding {sellEx}" + value (signed %, e.g. `+0.0095%`).
  - Chart options: transparent background, text `#69707f`, grid lines `#161a24`, scale/time borders `#242a39`, crosshair color `#3a4150` with violet `#7b61ff` axis labels, font `JetBrains Mono` 10.5px.

### Jobs & positions panel
- **Tab bar** (`padding:0 15px`, bottom border `#191e2a`): underline tabs **"Active jobs"**, **"Open positions"**, **"Closed positions"**, each with a count badge. Active tab: text `#e7e9ee`, weight 600, 2px violet bottom-border; badge violet on `rgba(123,97,255,.18)`. Inactive: text `#969cab`, badge on `#13161f`.
- **Table** (`overflow:auto`): CSS-grid rows, sticky header row (`background:#0f1118`, 10px uppercase `#5d6473`, `letter-spacing:.05em`). Data rows 44–46px tall, 12.5px, bottom border `#191e2a`, `white-space:nowrap`, hover `background:#13161f`. Each table sets a `min-width` so columns keep size and the panel scrolls horizontally when narrow.

  **Active jobs** — `grid-template-columns: 16px 1.5fr 1fr 1.1fr .8fr .8fr .9fr 1.1fr 1fr .9fr 76px; min-width:780px`
  Columns: status dot (green, pulsing) · Route · Symbol (mono) · Mode · Enter% (green) · Exit% (red) · Spread now (green if ≥ enter, amber if below) · Filled (e.g. `0.32 / 0.50`) · Notional · Runtime · **Stop** button (red ghost: text `#ff5266`, bg `rgba(255,82,102,.12)`, border `rgba(255,82,102,.25)`, radius 6).

  **Open positions** — `grid-template-columns: 1fr 1.1fr .8fr .9fr 1fr 1fr .6fr 1fr 1fr; min-width:660px`
  Columns: Exchange · Symbol · Side badge (Long = green pill, Short = red pill) · Size · Entry · Mark · Lev · Margin · uPnL (right-aligned, green if ≥0 else red). Each job appears as two legs (long + short).

  **Closed positions** — `grid-template-columns: 1.1fr 1.4fr 1fr .8fr .9fr .9fr 1fr .8fr .9fr; min-width:700px`
  Columns: Closed time · Route · Symbol · Size · Entry spread (green) · Exit spread (red) · Realized PnL (green/red) · Fees · Duration.

### Config rail
- **Order tabs** segmented control **"Open" / "Close"** (active violet). Switching changes the spread field label/value and the Start button (see Interactions).
- **Margin type** segmented **"Cross" / "Isolated"** (active violet).
- **Leverage**: label + live value `{n}×` in violet 14px mono. Range slider 1–100; track `#262c3b`, thumb 15px violet with `0 0 0 4px rgba(123,97,255,.18)` halo. Tick labels `1× 25× 50× 100×`.
- **Symbol**: dropdown button (full width, `background:#13161f`, border `#242a39`, radius 9, `padding:11px 13px`), value in mono 14px/600 + chevron. Opens symbol menu. Symbols: **BTC/USDT, ETH/USDT, SOL/USDT, BNB/USDT, XRP/USDT, DOGE/USDT.**
- **Spread field**: label is **"Enter spread %"** on Open tab / **"Exit spread %"** on Close tab; right helper "now {currentSpread}". Text input + "%" suffix. Field wrapper `background:#13161f; border:1px solid #242a39; radius 9`, border turns violet on focus-within.
- **Size**: label + helper "≈ {notional}". Input + base-asset suffix (e.g. "BTC").
- **Chunk size**: label + helper "{n} orders" (= ceil(size/chunk)). Input + base-asset suffix.
- **Summary box** (`background:#13161f`, border `#191e2a`, radius 10, 11.5px): rows — Current spread (green) · "Opens when ≥ / Closes when ≤" {target}% · Notional / leg · Est. taker fees ~0.04%.
- **Start button** (footer, top border `#191e2a`): full-width, 14px/700, radius 10.
  - Open tab: green `linear-gradient(180deg,#00e09a,#00b87d)`, dark text `#04130d`, label **"Start job"**.
  - Close tab: red `linear-gradient(180deg,#ff6172,#ec3a4a)`, white text, label **"Close positions"**.

### Dropdown pattern (symbol / buy / sell)
Absolutely-positioned menu (`background:#191d27`, border `#242a39`, radius 10, `padding:5px`, shadow `0 14px 40px rgba(0,0,0,.55)`). Items: full-width, `padding:8px 10px`, radius 7, hover-able; selected item shows text `#e7e9ee` + a small violet dot on the right (hidden when unselected). A full-screen transparent overlay (`position:fixed; inset:0; z-index:40`) closes any open menu on outside click; menus sit at `z-index:60`.

---

## Interactions & Behavior
- **Mode / layout / order-tab / margin** segmented controls: set state, restyle active button.
- **Layout toggle**: switch rail left/right via `flex-direction`. **The chart must call its resize routine** after the reflow so canvases match the new container size.
- **Order tab (Open/Close)**: switches the single spread field between `enterSpread` and `exitSpread` state, updates its label, the summary "Opens/Closes when" row, and the Start button color + label.
- **Spread field change**: live-updates the corresponding **Enter/Exit horizontal price line** on the chart (remove old line, draw new at parsed value).
- **Leverage slider**: updates `{n}×` readout live.
- **Size / chunk inputs**: recompute notional (`size × refPrice`) and chunk count (`ceil(size/chunk)`).
- **Dropdowns**: toggle open; selecting sets value and closes; outside-click overlay closes.
- **Stop button** (per job row) and **Start button**: wire to backend job start/stop endpoints (no-ops in prototype).
- **Status dot** on active jobs pulses via `@keyframes pulse {0%,100%{opacity:1} 50%{opacity:.3}}` (~1.8s).

## State Management
Per-screen UI state: `mode` (longshort|spotshort), `layout` (right|left), `orderTab` (open|close), `margin` (cross|isolated), `leverage` (int), `symbol`, `buyEx`, `sellEx`, `enterSpread`, `exitSpread`, `size`, `chunk`, `jobsTab` (active|open|closed), `openMenu` (sym|buy|sell|null), and live chart-derived `lastIn/lastOut/lastFA/lastFB`.

Data to fetch from backend / exchange feeds:
- Live spread series (In/Out) + funding series per selected route & symbol → chart.
- Active jobs list, open positions list, closed positions history → tables.
- Reference mark prices per symbol (for notional estimate).
- Job create/stop, position close actions.

A static `refPrice` map is used in the prototype for notional math: BTC 64200, ETH 3120, SOL 162, BNB 590, XRP 0.52, DOGE 0.162 — replace with live marks.

---

## Design Tokens
**Colors**
- Background `#0a0b0f`
- Panel `#0f1118` · Panel-2 (inputs/segments) `#13161f` · Elevated (menus) `#191d27`
- Border `#242a39` · Border-soft `#191e2a`
- Text `#e7e9ee` · Text-2 `#969cab` · Text-3 `#5d6473`
- Green (up / In / long) `#00d18f` · Green tint `rgba(0,209,143,.12)`
- Red (down / Out / short) `#ff5266` · Red tint `rgba(255,82,102,.12)`
- Brand accent (violet) `#7b61ff` · Brand tint `rgba(123,97,255,.14–.18)`
- Funding amber `#f0a830` · Funding blue `#5b8def`
- Chart grid `#161a24` · chart text `#69707f`

**Typography**
- UI: **Geist** (400/500/600/700), fallback `"Helvetica Neue", Arial, sans-serif`.
- Numerics & code: **JetBrains Mono** (400/500/600) — used for all prices, sizes, %, times, equity.
- Sizes: big spread 19px · panel/symbol titles 14px · body/table 12–13px · labels 10–11px · micro 9–10px.

**Radius**: panels/buttons 10–12 · segments/inputs/menus 8–10 · pills/badges 5–10. **Shadows**: violet button `0 2px 10px rgba(123,97,255,.35)`; green/red Start `0 4px 18px rgba(color,.32)`; menu `0 14px 40px rgba(0,0,0,.55)`. **Spacing**: panel gap 10px, panel padding 10–15px, rail field gap 15px.

## Assets
- **TradingView Lightweight Charts v4.2.0** — the only external lib (CDN in the prototype: `unpkg.com/lightweight-charts@4.2.0`). Use the same library or your codebase's existing charting lib; the spec above (two price scales, line series, dashed price lines) maps to its API.
- Icons (logo arrows, chevrons, route arrow, layout glyphs) are inline SVG — recreate with your icon set.
- No raster images or fonts to bundle beyond the two Google Fonts (Geist, JetBrains Mono).

## Files
- `Arbitrage Terminal.dc.html` — the full hi-fi prototype (open in a browser to interact). Markup, inline styles, and the logic class inside it are the source of truth for layout, tokens, and behavior.
