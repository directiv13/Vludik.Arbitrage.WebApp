import { Tick } from '@/types/ws';
import { CreateJobRequest, JobType, MarginType } from '@/types/jobs';
import { StrategyMode, contractTypesForMode } from '@/store/subscriptionStore';
import { midPrice } from '@/lib/spread';

/** Form fields that can carry an inline validation message. */
export type JobFormField = 'symbol' | 'spreadPerc' | 'size' | 'chunkSize' | 'leverage';

/**
 * Everything the rail form needs to validate and assemble a job — the jobStore's
 * raw-string inputs plus the committed symbol / exchange pair from the
 * subscription store. Kept as one flat shape so validation stays a pure function.
 */
export interface JobFormInput {
  type: JobType;
  marginType: MarginType;
  leverage: number;
  size: string;
  chunkSize: string;
  spreadPerc: string;
  symbol: string;
  buyExchangeName: string;
  sellExchangeName: string;
}

export interface JobFormValidation {
  valid: boolean;
  errors: Partial<Record<JobFormField, string>>;
}

/** True for a non-blank string that parses to a finite number. */
function parsedFinite(raw: string): number | null {
  if (raw.trim() === '') return null;
  const n = Number(raw);
  return Number.isFinite(n) ? n : null;
}

/**
 * Validates the rail form (§5). Pure and unit-testable — no store or DOM access.
 * Raw strings are parsed here at the boundary; the store keeps them as typed.
 */
export function validateJobForm(input: JobFormInput): JobFormValidation {
  const errors: Partial<Record<JobFormField, string>> = {};

  if (!input.symbol) {
    errors.symbol = 'Select a symbol';
  }

  const spread = parsedFinite(input.spreadPerc);
  if (spread === null) {
    errors.spreadPerc = 'Enter a number';
  }

  const size = parsedFinite(input.size);
  if (size === null || size <= 0) {
    errors.size = 'Enter a size greater than 0';
  }

  const chunk = parsedFinite(input.chunkSize);
  if (chunk === null || chunk <= 0) {
    errors.chunkSize = 'Enter a chunk greater than 0';
  } else if (size !== null && size > 0 && chunk > size) {
    errors.chunkSize = 'Chunk cannot exceed size';
  }

  if (!Number.isInteger(input.leverage) || input.leverage < 1 || input.leverage > 500) {
    errors.leverage = 'Leverage must be 1–500';
  }

  // Exchanges are picked in the header, not the rail — gate submit on them but
  // don't surface a per-field message (there's no rail input to anchor it to).
  const exchangesSet = input.buyExchangeName !== '' && input.sellExchangeName !== '';
  const valid = exchangesSet && Object.keys(errors).length === 0;

  return { valid, errors };
}

/**
 * Assembles the `POST /jobs` body (§3). Contract types are derived from the
 * strategy mode, never user input. Call only after `validateJobForm` passes.
 */
export function buildJobPayload(input: JobFormInput, mode: StrategyMode): CreateJobRequest {
  const { buy, sell } = contractTypesForMode(mode);
  return {
    symbol: input.symbol,
    buyExchange: { name: input.buyExchangeName, contractType: buy },
    sellExchange: { name: input.sellExchangeName, contractType: sell },
    type: input.type,
    spreadPerc: Number(input.spreadPerc),
    size: Number(input.size),
    chunkSize: Number(input.chunkSize),
    marginType: input.marginType,
    // TODO: in spot-short mode the buy leg is spot, where leverage/marginType are
    // meaningless; we still send them because the API requires the fields — the
    // backend may ignore them for a spot leg.
    leverage: input.leverage,
  };
}

// Quote assets ordered longest-first so e.g. FDUSD/BUSD win over a bare USD suffix.
const QUOTE_ASSETS = ['FDUSD', 'USDT', 'USDC', 'BUSD', 'TUSD', 'USD', 'DAI', 'BTC', 'ETH'];

/**
 * Derives the base asset from an unslashed symbol (e.g. `BTCUSDT` → `BTC`) by
 * stripping a known quote suffix. Falls back to the whole symbol.
 */
export function baseAsset(symbol: string): string {
  const s = symbol.toUpperCase();
  for (const q of QUOTE_ASSETS) {
    if (s.length > q.length && s.endsWith(q)) {
      return s.slice(0, -q.length);
    }
  }
  return s;
}

/** Number of chunk orders `ceil(size / chunkSize)`, or `null` if either is unset/invalid. */
export function chunkCount(size: string, chunkSize: string): number | null {
  const s = parsedFinite(size);
  const c = parsedFinite(chunkSize);
  if (s === null || c === null || s <= 0 || c <= 0) return null;
  return Math.ceil(s / c);
}

/** `≈ $notional` from the buy-side tick's mid price × size, or `—` when unavailable. */
export function formatNotional(buyTick: Tick | null, size: string): string {
  const s = parsedFinite(size);
  if (!buyTick || s === null || s <= 0) return '—';
  const notional = midPrice(buyTick) * s;
  return `$${Math.round(notional).toLocaleString('en-US')}`;
}

/** Formats a spread percentage to 3 decimals, or `—` when there's no value yet. */
export function formatSpreadPct(value: number | null): string {
  if (value === null || !Number.isFinite(value)) return '—';
  return `${value.toFixed(3)}%`;
}
