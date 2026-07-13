'use client';

import { useEffect, useState } from 'react';
import {
  contractTypesForMode,
  StrategyMode,
  useSubscriptionStore,
} from '@/store/subscriptionStore';
import { RailLayout, useUiStore } from '@/store/uiStore';
import { Dropdown } from '@/components/ui/Dropdown';
import { fetchVenues } from '@/lib/marketClient';
import { Venues } from '@/types/market';

const MODES: ReadonlyArray<{ label: string; value: StrategyMode }> = [
  { label: 'Long + Short', value: 'long-short' },
  { label: 'Spot + Short', value: 'spot-short' },
];

const SEG_BASE =
  'flex-1 whitespace-nowrap rounded-[7px] px-2 py-[7px] text-xs font-semibold transition-all duration-150';
const SEG_ON = 'bg-brand text-white shadow-[0_2px_10px_rgba(123,97,255,.35)]';
const SEG_OFF = 'bg-transparent text-tx2 hover:text-tx';

const ICON_BASE =
  'flex h-[26px] w-[30px] items-center justify-center rounded-md transition-all duration-150';
const ICON_ON = 'bg-brand text-white';
const ICON_OFF = 'bg-transparent text-tx3 hover:text-tx2';

export function Header() {
  const strategyMode = useSubscriptionStore((s) => s.strategyMode);
  const setStrategyMode = useSubscriptionStore((s) => s.setStrategyMode);
  const buyExchangeName = useSubscriptionStore((s) => s.buyExchangeName);
  const sellExchangeName = useSubscriptionStore((s) => s.sellExchangeName);
  const setExchanges = useSubscriptionStore((s) => s.setExchanges);
  const setBuyExchange = useSubscriptionStore((s) => s.setBuyExchange);
  const setSellExchange = useSubscriptionStore((s) => s.setSellExchange);
  const layout = useUiStore((s) => s.layout);
  const setLayout = useUiStore((s) => s.setLayout);

  const [venues, setVenues] = useState<Venues | null>(null);

  useEffect(() => {
    const controller = new AbortController();
    fetchVenues(controller.signal)
      .then(setVenues)
      .catch(() => {
        /* ignore — dropdowns stay empty if venues can't load */
      });
    return () => controller.abort();
  }, []);

  const { buy: buyContractType, sell: sellContractType } = contractTypesForMode(strategyMode);
  const buyOptions = venues?.[buyContractType] ?? [];
  const sellOptions = venues?.[sellContractType] ?? [];

  // Preselect defaults once venues load, and re-validate the pair whenever the
  // contract types change (a mode switch may invalidate the current exchange).
  useEffect(() => {
    if (!venues) return;
    const { buy, sell } = contractTypesForMode(strategyMode);
    const bOpts = venues[buy];
    const sOpts = venues[sell];
    const validBuy = bOpts.includes(buyExchangeName) ? buyExchangeName : bOpts[0] ?? '';
    const validSell = sOpts.includes(sellExchangeName) ? sellExchangeName : sOpts[0] ?? '';
    if (validBuy !== buyExchangeName || validSell !== sellExchangeName) {
      setExchanges(validBuy, validSell);
    }
  }, [venues, strategyMode, buyExchangeName, sellExchangeName, setExchanges]);

  return (
    <header className="flex h-[54px] flex-none items-center gap-[18px] border-b border-bd bg-panel px-4">
      {/* logo + wordmark */}
      <div className="flex items-center gap-[9px]">
        <div className="flex h-[27px] w-[27px] items-center justify-center rounded-[7px] bg-[linear-gradient(145deg,#8b73ff,#6a4dff)] shadow-[0_2px_10px_rgba(123,97,255,.45)]">
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none">
            <path
              d="M3 8h13l-3.5-3.5M21 16H8l3.5 3.5"
              stroke="#fff"
              strokeWidth="2.2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </div>
        <span className="text-[15px] font-bold tracking-[-0.01em]">Arbor</span>
        <span className="rounded-[5px] bg-brand/15 px-[6px] py-[2px] text-[9.5px] font-semibold tracking-[0.06em] text-brand">
          ARB
        </span>
      </div>

      {/* strategy mode segmented control */}
      <div className="flex gap-1 rounded-[9px] border border-bd bg-panel2 p-[3px]">
        {MODES.map((mode) => {
          const active = strategyMode === mode.value;
          return (
            <button
              key={mode.value}
              type="button"
              onClick={() => setStrategyMode(mode.value)}
              aria-pressed={active}
              className={`${SEG_BASE} ${active ? SEG_ON : SEG_OFF}`}
            >
              {mode.label}
            </button>
          );
        })}
      </div>

      {/* exchange route: BUY → SELL */}
      <div className="ml-1 flex items-center gap-2">
        <Dropdown
          value={buyExchangeName}
          options={buyOptions}
          onChange={setBuyExchange}
          prefix={
            <span className="text-[9px] font-semibold tracking-[0.05em] text-grn">BUY</span>
          }
        />
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden>
          <path
            d="M5 12h14m0 0l-5-5m5 5l-5 5"
            stroke="#5d6473"
            strokeWidth="1.8"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
        <Dropdown
          value={sellExchangeName}
          options={sellOptions}
          onChange={setSellExchange}
          prefix={
            <span className="text-[9px] font-semibold tracking-[0.05em] text-red">SELL</span>
          }
        />
      </div>

      <div className="flex-1" />

      {/* layout toggle */}
      <div className="flex items-center gap-[6px] rounded-[9px] border border-bd bg-panel2 p-[3px]">
        <LayoutButton
          target="right"
          active={layout === 'right'}
          onClick={() => setLayout('right')}
        />
        <LayoutButton
          target="left"
          active={layout === 'left'}
          onClick={() => setLayout('left')}
        />
      </div>
    </header>
  );
}

interface LayoutButtonProps {
  target: RailLayout;
  active: boolean;
  onClick: () => void;
}

function LayoutButton({ target, active, onClick }: LayoutButtonProps) {
  const railRight = target === 'right';
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      title={railRight ? 'Rail right' : 'Rail left'}
      className={`${ICON_BASE} ${active ? ICON_ON : ICON_OFF}`}
    >
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
        {railRight ? (
          <>
            <rect x="3" y="4" width="12" height="16" rx="1.5" stroke="currentColor" strokeWidth="1.6" />
            <rect x="17" y="4" width="4" height="16" rx="1.5" fill="currentColor" />
          </>
        ) : (
          <>
            <rect x="3" y="4" width="4" height="16" rx="1.5" fill="currentColor" />
            <rect x="9" y="4" width="12" height="16" rx="1.5" stroke="currentColor" strokeWidth="1.6" />
          </>
        )}
      </svg>
    </button>
  );
}
