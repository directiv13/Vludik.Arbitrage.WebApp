import { ContractType } from '@/types/ws';
import { SpreadPoint } from '@/lib/spread';
import {
  SpreadHistoryQuery,
  SpreadHistoryResponse,
  Venues,
} from '@/types/market';

/**
 * Fetches a same-origin `/api/market/<path>` route (the no-auth BFF proxy). These
 * endpoints require no session, so this uses plain `fetch` — NOT `apiFetch`, whose
 * 401 handling would bounce anonymous users to `/login`.
 */
async function marketFetch<T>(path: string, signal?: AbortSignal): Promise<T> {
  const res = await fetch(`/api/market/${path}`, {
    credentials: 'same-origin',
    signal,
  });
  if (!res.ok) {
    throw new Error(`market request failed: ${path} (${res.status})`);
  }
  return (await res.json()) as T;
}

/** `GET /api/market/venues` → available exchanges per contract type. */
export function fetchVenues(signal?: AbortSignal): Promise<Venues> {
  return marketFetch<Venues>('venues', signal);
}

/** `GET /api/market/symbols` → symbols listed on one exchange + contract type. */
export function fetchSymbols(
  exchange: string,
  contractType: ContractType,
  signal?: AbortSignal,
): Promise<string[]> {
  const query = new URLSearchParams({ exchange, contractType });
  return marketFetch<string[]>(`symbols?${query.toString()}`, signal);
}

/**
 * Symbols common to both sides of the spread — the set intersection of each
 * exchange's symbol list. Fetches both sides in parallel; preserves buy-side order.
 */
export async function fetchCommonSymbols(
  buyExchange: string,
  buyContractType: ContractType,
  sellExchange: string,
  sellContractType: ContractType,
  signal?: AbortSignal,
): Promise<string[]> {
  const [buySyms, sellSyms] = await Promise.all([
    fetchSymbols(buyExchange, buyContractType, signal),
    fetchSymbols(sellExchange, sellContractType, signal),
  ]);
  const sellSet = new Set(sellSyms);
  return buySyms.filter((s) => sellSet.has(s));
}

/**
 * `GET /api/market/history-spread` → historical spread, mapped onto the chart's
 * `SpreadPoint` shape (unix-seconds time) so it can seed the buffer directly.
 */
export async function fetchSpreadHistory(
  params: SpreadHistoryQuery,
  signal?: AbortSignal,
): Promise<SpreadPoint[]> {
  const query = new URLSearchParams({
    buyExchange: params.buyExchange,
    buyContractType: params.buyContractType,
    sellExchange: params.sellExchange,
    sellContractType: params.sellContractType,
    symbol: params.symbol,
  });
  const res = await marketFetch<SpreadHistoryResponse>(
    `history-spread?${query.toString()}`,
    signal,
  );
  return res.data.map((p) => ({
    time: p.timestamp,
    inValue: p.in,
    outValue: p.out,
  }));
}
