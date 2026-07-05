/**
 * Decorative left panel of the /login screen. Ported from design/Login.dc.html —
 * purely presentational, no props.
 */
export function BrandPanel() {
  return (
    <div className="relative flex min-w-0 flex-[1.15] flex-col justify-between overflow-hidden border-r border-bd bg-panel p-11 bg-[radial-gradient(1100px_620px_at_12%_8%,rgba(123,97,255,.13),transparent_60%),radial-gradient(900px_600px_at_92%_96%,rgba(0,209,143,.07),transparent_55%)]">
      {/* spread-chart motif */}
      <svg
        viewBox="0 0 800 600"
        preserveAspectRatio="none"
        className="pointer-events-none absolute inset-0 h-full w-full opacity-50"
      >
        <defs>
          <linearGradient id="ginfill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#00d18f" stopOpacity=".12" />
            <stop offset="1" stopColor="#00d18f" stopOpacity="0" />
          </linearGradient>
        </defs>
        <g stroke="#161a24" strokeWidth="1">
          <line x1="0" y1="150" x2="800" y2="150" />
          <line x1="0" y1="300" x2="800" y2="300" />
          <line x1="0" y1="450" x2="800" y2="450" />
          <line x1="200" y1="0" x2="200" y2="600" />
          <line x1="400" y1="0" x2="400" y2="600" />
          <line x1="600" y1="0" x2="600" y2="600" />
        </g>
        <path d="M0 470 L80 360 L120 300 L120 600 L0 600 Z" fill="url(#ginfill)" />
        <path
          d="M0 320 C90 300 130 250 200 268 C280 288 300 200 380 214 C470 230 500 150 590 176 C560 176 700 210 800 150"
          fill="none"
          stroke="#00d18f"
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeDasharray="6 7"
          className="animate-[arbor-dash_26s_linear_infinite]"
        />
        <path
          d="M0 430 C90 420 140 400 210 410 C300 424 320 360 400 372 C480 384 520 330 600 344 C690 360 720 320 800 332"
          fill="none"
          stroke="#ff5266"
          strokeWidth="2.5"
          strokeLinecap="round"
          opacity=".92"
        />
        <path
          d="M0 545 C120 535 150 555 260 548 C380 540 430 560 540 552 C660 544 700 556 800 550"
          fill="none"
          stroke="#f0a830"
          strokeWidth="1.4"
          opacity=".7"
        />
        <path
          d="M0 566 C120 560 160 572 280 566 C400 560 440 574 560 568 C680 562 720 572 800 567"
          fill="none"
          stroke="#5b8def"
          strokeWidth="1.4"
          opacity=".7"
        />
      </svg>

      {/* logo */}
      <div className="relative flex items-center gap-[10px]">
        <div className="flex h-[30px] w-[30px] items-center justify-center rounded-lg bg-[linear-gradient(145deg,#8b73ff,#6a4dff)] shadow-[0_2px_12px_rgba(123,97,255,.5)]">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
            <path
              d="M3 8h13l-3.5-3.5M21 16H8l3.5 3.5"
              stroke="#fff"
              strokeWidth="2.2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </div>
        <span className="text-[17px] font-bold tracking-[-0.01em]">Arbor</span>
        <span className="rounded-[5px] bg-brand/[0.14] px-[6px] py-[2px] text-[9.5px] font-semibold tracking-[0.06em] text-brand">
          ARB
        </span>
      </div>

      {/* headline + live stat strip */}
      <div className="relative max-w-[520px]">
        <div className="mb-[22px] inline-flex animate-[arbor-rise_.5s_cubic-bezier(.4,0,.2,1)_both] items-center gap-2 rounded-full border border-bd bg-panel2 py-[5px] pr-[11px] pl-[9px]">
          <span className="h-[7px] w-[7px] animate-[arbor-pulse_1.8s_ease-in-out_infinite] rounded-full bg-grn" />
          <span className="text-[11.5px] text-tx2">
            Live spread engine · <span className="font-mono text-tx">14</span> venues
          </span>
        </div>
        <h1 className="m-0 mb-[14px] animate-[arbor-rise_.5s_cubic-bezier(.4,0,.2,1)_both] text-[38px] leading-[1.1] font-bold tracking-[-0.02em] text-balance">
          Cross-exchange arbitrage,
          <br />
          <span className="text-brand">automated.</span>
        </h1>
        <p className="m-0 mb-[30px] max-w-[440px] animate-[arbor-rise_.5s_cubic-bezier(.4,0,.2,1)_both] text-[15px] leading-[1.55] text-tx2">
          Run spread jobs that open hedged positions the moment your edge appears — and
          close them when it converges. Across Binance, Bybit, OKX, Gate and more.
        </p>

        <div className="flex animate-[arbor-rise_.5s_cubic-bezier(.4,0,.2,1)_both] gap-[26px]">
          <div>
            <div className="font-mono text-[22px] font-semibold text-grn">$1.2B+</div>
            <div className="mt-[3px] text-[11.5px] text-tx3">Volume routed</div>
          </div>
          <div className="w-px bg-bd" />
          <div>
            <div className="font-mono text-[22px] font-semibold">6</div>
            <div className="mt-[3px] text-[11.5px] text-tx3">Exchanges</div>
          </div>
          <div className="w-px bg-bd" />
          <div>
            <div className="font-mono text-[22px] font-semibold">38ms</div>
            <div className="mt-[3px] text-[11.5px] text-tx3">Median fill</div>
          </div>
        </div>
      </div>

      {/* footer */}
      <div className="relative flex gap-5 text-[11.5px] text-tx3">
        <span>© 2026 Arbor</span>
        <span>
          Status: <span className="text-grn">operational</span>
        </span>
      </div>
    </div>
  );
}
