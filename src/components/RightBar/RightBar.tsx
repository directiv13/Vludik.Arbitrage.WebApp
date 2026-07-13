'use client';

import { useEffect, useState } from 'react';
import {
  contractTypesForMode,
  useSubscriptionStore,
} from '@/store/subscriptionStore';
import { useJobStore } from '@/store/jobStore';
import { Dropdown } from '@/components/ui/Dropdown';
import { SegmentedControl, SegmentedOption } from '@/components/ui/SegmentedControl';
import { NumericField } from '@/components/ui/NumericField';
import { fetchCommonSymbols } from '@/lib/marketClient';
import { computeInSpread } from '@/lib/spread';
import { createJob } from '@/lib/jobsClient';
import {
  JobFormInput,
  baseAsset,
  buildJobPayload,
  chunkCount,
  formatNotional,
  formatSpreadPct,
  validateJobForm,
} from '@/lib/jobForm';
import { JobError, JobType, MarginType } from '@/types/jobs';

const TYPE_OPTIONS: ReadonlyArray<SegmentedOption<JobType>> = [
  { label: 'Open', value: 'open' },
  { label: 'Close', value: 'close' },
];

const MARGIN_OPTIONS: ReadonlyArray<SegmentedOption<MarginType>> = [
  { label: 'Cross', value: 'cross' },
  { label: 'Isolated', value: 'isolated' },
];

const LEVERAGE_TICKS = ['1×', '125×', '250×', '500×'];

const RANGE_CLASSES =
  'h-1 w-full cursor-pointer appearance-none rounded-[4px] bg-[#262c3b] outline-none ' +
  '[&::-webkit-slider-thumb]:[-webkit-appearance:none] [&::-webkit-slider-thumb]:h-[15px] ' +
  '[&::-webkit-slider-thumb]:w-[15px] [&::-webkit-slider-thumb]:rounded-full ' +
  '[&::-webkit-slider-thumb]:bg-brand [&::-webkit-slider-thumb]:shadow-[0_0_0_4px_rgba(123,97,255,.18)] ' +
  '[&::-moz-range-thumb]:h-[15px] [&::-moz-range-thumb]:w-[15px] [&::-moz-range-thumb]:rounded-full ' +
  '[&::-moz-range-thumb]:border-none [&::-moz-range-thumb]:bg-brand';

const START_BASE =
  'w-full rounded-[10px] py-[13px] text-sm font-bold tracking-[0.01em] transition-all duration-150 ' +
  'hover:brightness-105 disabled:cursor-not-allowed disabled:opacity-60 disabled:hover:brightness-100';
const START_OPEN =
  'bg-[linear-gradient(180deg,#00e09a,#00b87d)] text-[#04130d] shadow-[0_4px_18px_rgba(0,209,143,.32)]';
const START_CLOSE =
  'bg-[linear-gradient(180deg,#ff6172,#ec3a4a)] text-white shadow-[0_4px_18px_rgba(255,82,102,.32)]';

export function RightBar() {
  const symbol = useSubscriptionStore((s) => s.symbol);
  const strategyMode = useSubscriptionStore((s) => s.strategyMode);
  const buyExchangeName = useSubscriptionStore((s) => s.buyExchangeName);
  const sellExchangeName = useSubscriptionStore((s) => s.sellExchangeName);
  const setSymbol = useSubscriptionStore((s) => s.setSymbol);
  const latestBuyTick = useSubscriptionStore((s) => s.latestBuyTick);
  const latestSellTick = useSubscriptionStore((s) => s.latestSellTick);

  const type = useJobStore((s) => s.type);
  const marginType = useJobStore((s) => s.marginType);
  const leverage = useJobStore((s) => s.leverage);
  const size = useJobStore((s) => s.size);
  const chunkSize = useJobStore((s) => s.chunkSize);
  const spreadPerc = useJobStore((s) => s.spreadPerc);
  const submitState = useJobStore((s) => s.submitState);
  const submitError = useJobStore((s) => s.submitError);
  const setType = useJobStore((s) => s.setType);
  const setMarginType = useJobStore((s) => s.setMarginType);
  const setLeverage = useJobStore((s) => s.setLeverage);
  const setSize = useJobStore((s) => s.setSize);
  const setChunkSize = useJobStore((s) => s.setChunkSize);
  const setSpreadPerc = useJobStore((s) => s.setSpreadPerc);
  const setSubmitState = useJobStore((s) => s.setSubmitState);

  const [symbols, setSymbols] = useState<string[]>([]);

  // When the exchange pair or contract types change, drop the symbol list so it
  // can't briefly show options invalid for the new pair (the store already
  // clears the committed `symbol`). Guarding on a key change is React's
  // recommended pattern over a setState-in-effect.
  const pairKey = `${buyExchangeName}|${sellExchangeName}|${strategyMode}`;
  const [prevPairKey, setPrevPairKey] = useState(pairKey);
  if (pairKey !== prevPairKey) {
    setPrevPairKey(pairKey);
    setSymbols([]);
  }

  // Fetch the symbols common to both exchanges for the current pair.
  useEffect(() => {
    if (!buyExchangeName || !sellExchangeName) return;
    const controller = new AbortController();
    const { buy, sell } = contractTypesForMode(strategyMode);
    fetchCommonSymbols(buyExchangeName, buy, sellExchangeName, sell, controller.signal)
      .then(setSymbols)
      .catch(() => {
        /* ignore — dropdown stays empty if symbols can't load */
      });
    return () => controller.abort();
  }, [buyExchangeName, sellExchangeName, strategyMode]);

  // Success is a transient banner — revert to idle after ~2s, keeping form values.
  useEffect(() => {
    if (submitState !== 'success') return;
    const id = setTimeout(() => setSubmitState('idle'), 2000);
    return () => clearTimeout(id);
  }, [submitState, setSubmitState]);

  const formInput: JobFormInput = {
    type,
    marginType,
    leverage,
    size,
    chunkSize,
    spreadPerc,
    symbol,
    buyExchangeName,
    sellExchangeName,
  };
  const { valid, errors } = validateJobForm(formInput);

  // Reveal a field's error only once the user has typed into it (empty ⇒ pristine),
  // so a fresh form isn't painted red before any input.
  const dirtyError = (field: keyof typeof errors, raw: string) =>
    raw.trim() !== '' ? errors[field] : undefined;

  const bothTicks = latestBuyTick && latestSellTick;
  const currentInSpread = bothTicks
    ? computeInSpread(latestBuyTick, latestSellTick)
    : null;
  const currentInText = formatSpreadPct(currentInSpread);
  const notionalText = formatNotional(latestBuyTick, size);
  const base = symbol ? baseAsset(symbol) : '';
  const orders = chunkCount(size, chunkSize);

  const isOpen = type === 'open';
  const spreadLabel = isOpen ? 'Enter spread %' : 'Exit spread %';
  const targetLabel = isOpen ? 'Opens when ≥' : 'Closes when ≤';
  const targetText = spreadPerc.trim() !== '' ? `${spreadPerc}%` : '—';

  let startLabel: string;
  if (submitState === 'pending') startLabel = 'Starting…';
  else if (submitState === 'success') startLabel = 'Job created ✓';
  else startLabel = isOpen ? 'Start job' : 'Close positions';

  const submitDisabled =
    !valid || submitState === 'pending' || submitState === 'success';

  const handleSubmit = async () => {
    if (!valid || submitState === 'pending') return;
    setSubmitState('pending');
    try {
      await createJob(buildJobPayload(formInput, strategyMode));
      setSubmitState('success');
    } catch (err) {
      const message =
        err instanceof JobError ? err.message : "Couldn't start job. Try again.";
      setSubmitState('error', message);
    }
  };

  return (
    <aside className="flex w-[336px] flex-none flex-col overflow-hidden rounded-xl border border-bd bg-panel">
      {/* Open / Close tabs — pinned at rail top */}
      <div className="mx-[13px] mt-[11px] flex-none">
        <SegmentedControl options={TYPE_OPTIONS} value={type} onChange={setType} />
      </div>

      <div className="flex flex-1 flex-col gap-[15px] overflow-auto px-[15px] pt-[14px] pb-[15px]">
        {/* Margin type */}
        <div className="flex flex-col gap-[7px]">
          <span className="text-[11px] text-tx2">Margin type</span>
          <SegmentedControl
            options={MARGIN_OPTIONS}
            value={marginType}
            onChange={setMarginType}
          />
        </div>

        {/* Leverage */}
        <div>
          <div className="mb-[9px] flex items-center justify-between">
            <span className="text-[11px] text-tx2">Leverage</span>
            <span className="font-mono text-[14px] font-semibold text-brand">{leverage}×</span>
          </div>
          <input
            type="range"
            min={1}
            max={500}
            step={1}
            value={leverage}
            onChange={(e) => setLeverage(Number(e.target.value))}
            className={RANGE_CLASSES}
            aria-label="Leverage"
          />
          <div className="mt-[6px] flex justify-between font-mono text-[9.5px] text-tx3">
            {LEVERAGE_TICKS.map((tick) => (
              <span key={tick}>{tick}</span>
            ))}
          </div>
        </div>

        {/* Symbol */}
        <div className="flex flex-col gap-[7px]">
          <span className="text-[11px] text-tx2">Symbol</span>
          <Dropdown
            value={symbol}
            options={symbols}
            onChange={setSymbol}
            mono
            searchable
            fullWidth
            placeholder="Select symbol"
            searchPlaceholder="Search symbol…"
          />
        </div>

        {/* Spread % */}
        <NumericField
          label={spreadLabel}
          value={spreadPerc}
          onChange={setSpreadPerc}
          suffix="%"
          hint={`now ${currentInText}`}
          error={dirtyError('spreadPerc', spreadPerc)}
          placeholder="0.0"
        />

        {/* Size */}
        <NumericField
          label="Size"
          value={size}
          onChange={setSize}
          suffix={base || undefined}
          hint={`≈ ${notionalText}`}
          error={dirtyError('size', size)}
          placeholder="0.0"
        />

        {/* Chunk size */}
        <NumericField
          label="Chunk size"
          value={chunkSize}
          onChange={setChunkSize}
          suffix={base || undefined}
          hint={orders === null ? '—' : `${orders} orders`}
          error={dirtyError('chunkSize', chunkSize)}
          placeholder="0.0"
        />

        {/* Summary */}
        <div className="flex flex-col gap-[9px] rounded-[10px] border border-bd2 bg-panel2 px-[13px] py-[12px] text-[11.5px]">
          <div className="flex justify-between">
            <span className="text-tx2">Current spread</span>
            <span className="font-mono text-grn">{currentInText}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-tx2">{targetLabel}</span>
            <span className="font-mono text-tx">{targetText}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-tx2">Notional / leg</span>
            <span className="font-mono text-tx">{notionalText}</span>
          </div>
        </div>
      </div>

      {/* Submit — pinned rail footer */}
      <div className="flex-none border-t border-bd2 px-[15px] py-[13px]">
        {submitState === 'error' && submitError && (
          <div className="mb-[10px] text-[11px] text-red">{submitError}</div>
        )}
        <button
          type="button"
          onClick={handleSubmit}
          disabled={submitDisabled}
          className={`${START_BASE} ${isOpen ? START_OPEN : START_CLOSE}`}
        >
          {startLabel}
        </button>
      </div>
    </aside>
  );
}
