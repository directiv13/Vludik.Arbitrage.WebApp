import { Tick } from '@/types/ws';

export function computeInSpread(buyTick: Tick, sellTick: Tick): number {
  return (buyTick.bestAsk - sellTick.bestBid) / buyTick.bestAsk * 100;
}

export function computeOutSpread(buyTick: Tick, sellTick: Tick): number {
  return (buyTick.bestBid - sellTick.bestAsk) / buyTick.bestBid * 100;
}

/** Mid price of a tick — used to estimate a job's notional value. */
export function midPrice(tick: Tick): number {
  return (tick.bestBid + tick.bestAsk) / 2;
}

/**
 * Converts a tick's epoch-ms timestamp to UNIX seconds. TradingView
 * Lightweight Charts requires UTCTimestamp (seconds).
 */
export function toChartTime(timestampMs: number): number {
  return Math.floor(timestampMs / 1000);
}

export type ChartFrequency = '1m' | '5m' | '15m' | '1h';

export const CHART_FREQUENCIES: readonly ChartFrequency[] = ['1m', '5m', '15m', '1h'];

export const FREQUENCY_SECONDS: Record<ChartFrequency, number> = {
  '1m': 60,
  '5m': 300,
  '15m': 900,
  '1h': 3600,
};

/** Floors a unix-seconds timestamp down to the start of its frequency bucket. */
export function bucketStart(timeSec: number, frequency: ChartFrequency): number {
  const size = FREQUENCY_SECONDS[frequency];
  return Math.floor(timeSec / size) * size;
}

export interface SpreadPoint {
  time: number; // unix seconds, raw tick time — NOT bucket time
  inValue: number;
  outValue: number;
}

export interface BucketPoint {
  time: number; // bucket start, unix seconds
  value: number;
}

/**
 * Aggregates raw tick-pair points into one point per frequency bucket, the
 * last point within a bucket winning (like a candle close). `points` must
 * already be time-ascending — true for the chart's append-only tick buffer —
 * so the resulting buckets come out time-ascending too without an extra sort.
 */
export function aggregateToBuckets(
  points: readonly SpreadPoint[],
  frequency: ChartFrequency
): { inPoints: BucketPoint[]; outPoints: BucketPoint[] } {
  const buckets = new Map<number, { in: number; out: number }>();
  for (const p of points) {
    const t = bucketStart(p.time, frequency);
    buckets.set(t, { in: p.inValue, out: p.outValue });
  }
  const inPoints: BucketPoint[] = [];
  const outPoints: BucketPoint[] = [];
  for (const [time, v] of buckets) {
    inPoints.push({ time, value: v.in });
    outPoints.push({ time, value: v.out });
  }
  return { inPoints, outPoints };
}

/** Formats a unix-seconds timestamp as "Jun 26, 20:24:30" for the hover tooltip. */
export function formatTooltipTime(timeSec: number): string {
  const date = new Date(timeSec * 1000);
  const datePart = date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  const timePart = date.toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  });
  return `${datePart}, ${timePart}`;
}
