'use client';

import { useEffect, useRef, useState } from 'react';
import {
  ColorType,
  createChart,
  CrosshairMode,
  LineSeries,
  type IChartApi,
  type ISeriesApi,
  type MouseEventParams,
  type Time,
  type UTCTimestamp,
} from 'lightweight-charts';
import {
  aggregateToBuckets,
  bucketStart,
  CHART_FREQUENCIES,
  computeInSpread,
  computeOutSpread,
  formatTooltipTime,
  toChartTime,
  type ChartFrequency,
  type SpreadPoint,
} from '@/lib/spread';
import { contractTypesForMode, useSubscriptionStore } from '@/store/subscriptionStore';
import { fetchSpreadHistory } from '@/lib/marketClient';

const IN_COLOR = '#07d100';
const OUT_COLOR = '#ff5266';

const fmtPct = (value: number): string => value.toFixed(3) + '%';

interface TooltipState {
  x: number;
  y: number;
  time: number;
  inValue: number;
  outValue: number;
}

/**
 * Pushes one tick-pair point onto a series. `series.update` upserts when
 * `time` equals the series' last point and appends when greater, so a single
 * call handles both "still inside the open bucket" and "bucket advanced".
 */
function applyTickToSeries(
  inSeries: ISeriesApi<'Line'>,
  outSeries: ISeriesApi<'Line'>,
  point: SpreadPoint,
  frequency: ChartFrequency,
  currentBucketTimeRef: { current: number }
): void {
  const bucketTime = bucketStart(point.time, frequency);
  const time = Math.max(bucketTime, currentBucketTimeRef.current) as UTCTimestamp;
  currentBucketTimeRef.current = time;
  inSeries.update({ time, value: point.inValue });
  outSeries.update({ time, value: point.outValue });
}

export function SpreadChart() {
  const containerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const inSeriesRef = useRef<ISeriesApi<'Line'> | null>(null);
  const outSeriesRef = useRef<ISeriesApi<'Line'> | null>(null);
  // Raw tick-pair history since the last clear, kept so frequency switches can
  // re-aggregate the whole session instead of only affecting future points.
  const pointsRef = useRef<SpreadPoint[]>([]);
  // Bucket-start time (seconds) of the currently-open bucket; guards against
  // ever feeding the series a decreasing time.
  const currentBucketTimeRef = useRef<number>(0);
  // Mirrors `frequency` state for use inside the tick-append effect without
  // making that effect re-run on frequency changes (see effect below).
  const frequencyRef = useRef<ChartFrequency>('1m');

  const [frequency, setFrequency] = useState<ChartFrequency>('1m');
  const [tooltip, setTooltip] = useState<TooltipState | null>(null);
  const [containerSize, setContainerSize] = useState({ width: 0, height: 0 });

  const symbol = useSubscriptionStore((s) => s.symbol);
  const buyExchangeName = useSubscriptionStore((s) => s.buyExchangeName);
  const sellExchangeName = useSubscriptionStore((s) => s.sellExchangeName);
  const strategyMode = useSubscriptionStore((s) => s.strategyMode);
  const latestBuyTick = useSubscriptionStore((s) => s.latestBuyTick);
  const latestSellTick = useSubscriptionStore((s) => s.latestSellTick);

  const hasPair = latestBuyTick !== null && latestSellTick !== null;
  const lastIn = hasPair ? fmtPct(computeInSpread(latestBuyTick, latestSellTick)) : '—';
  const lastOut = hasPair ? fmtPct(computeOutSpread(latestBuyTick, latestSellTick)) : '—';

  // Create the chart once on mount.
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const chart = createChart(container, {
      layout: {
        background: { type: ColorType.Solid, color: 'transparent' },
        textColor: '#69707f',
        // The canvas can't resolve the `next/font` CSS variable, so read the
        // computed mono family off the container (which carries `font-mono`).
        fontFamily: getComputedStyle(container).fontFamily,
        fontSize: 10.5,
      },
      grid: {
        vertLines: { color: '#161a24' },
        horzLines: { color: '#161a24' },
      },
      timeScale: {
        timeVisible: true,
        secondsVisible: false,
        borderColor: '#242a39',
      },
      rightPriceScale: {
        borderColor: '#242a39',
        scaleMargins: { top: 0.1, bottom: 0.12 },
      },
      crosshair: {
        mode: CrosshairMode.Normal,
        vertLine: { color: '#3a4150', width: 1, labelBackgroundColor: '#7b61ff' },
        horzLine: { color: '#3a4150', labelBackgroundColor: '#7b61ff' },
      },
      width: container.clientWidth,
      height: container.clientHeight,
    });

    inSeriesRef.current = chart.addSeries(LineSeries, {
      color: IN_COLOR,
      lineWidth: 2,
      priceFormat: { type: 'custom', formatter: fmtPct },
      priceLineVisible: false,
    });
    outSeriesRef.current = chart.addSeries(LineSeries, {
      color: OUT_COLOR,
      lineWidth: 2,
      priceFormat: { type: 'custom', formatter: fmtPct },
      priceLineVisible: false,
    });
    chartRef.current = chart;
    pointsRef.current = [];
    currentBucketTimeRef.current = 0;

    const handleCrosshairMove = (param: MouseEventParams<Time>) => {
      const inSeries = inSeriesRef.current;
      const outSeries = outSeriesRef.current;
      if (!param.point || param.time === undefined || !inSeries || !outSeries) {
        setTooltip(null);
        return;
      }
      const inData = param.seriesData.get(inSeries);
      const outData = param.seriesData.get(outSeries);
      if (!inData || !outData || !('value' in inData) || !('value' in outData)) {
        setTooltip(null);
        return;
      }
      setTooltip({
        x: param.point.x,
        y: param.point.y,
        time: param.time as number,
        inValue: inData.value,
        outValue: outData.value,
      });
    };
    chart.subscribeCrosshairMove(handleCrosshairMove);

    setContainerSize({ width: container.clientWidth, height: container.clientHeight });
    const resizeObserver = new ResizeObserver(() => {
      chart.applyOptions({
        width: container.clientWidth,
        height: container.clientHeight,
      });
      setContainerSize({ width: container.clientWidth, height: container.clientHeight });
    });
    resizeObserver.observe(container);

    return () => {
      chart.unsubscribeCrosshairMove(handleCrosshairMove);
      resizeObserver.disconnect();
      chart.remove();
      chartRef.current = null;
      inSeriesRef.current = null;
      outSeriesRef.current = null;
    };
  }, []);

  // Keep `frequencyRef` current so the tick-append effect below can read the
  // live frequency without needing it in its dependency array.
  useEffect(() => {
    frequencyRef.current = frequency;
  }, [frequency]);

  // Append a spread point whenever both sides have a tick.
  useEffect(() => {
    const inSeries = inSeriesRef.current;
    const outSeries = outSeriesRef.current;
    if (!inSeries || !outSeries) return;
    if (!latestBuyTick || !latestSellTick) return;

    const tsBuy = toChartTime(latestBuyTick.timestamp);
    const tsSell = toChartTime(latestSellTick.timestamp);
    const point: SpreadPoint = {
      time: Math.max(tsBuy, tsSell),
      inValue: computeInSpread(latestBuyTick, latestSellTick),
      outValue: computeOutSpread(latestBuyTick, latestSellTick),
    };
    pointsRef.current.push(point);
    applyTickToSeries(inSeries, outSeries, point, frequencyRef.current, currentBucketTimeRef);
  }, [latestBuyTick, latestSellTick]);

  // Switching frequency re-aggregates the whole session's raw points, not
  // just future ones, so the displayed resolution always matches the buffer.
  useEffect(() => {
    const inSeries = inSeriesRef.current;
    const outSeries = outSeriesRef.current;
    if (!inSeries || !outSeries) return;

    const { inPoints, outPoints } = aggregateToBuckets(pointsRef.current, frequency);
    inSeries.setData(inPoints.map((p) => ({ time: p.time as UTCTimestamp, value: p.value })));
    outSeries.setData(outPoints.map((p) => ({ time: p.time as UTCTimestamp, value: p.value })));
    currentBucketTimeRef.current = inPoints.length > 0 ? inPoints[inPoints.length - 1].time : 0;
  }, [frequency]);

  // Clear the chart whenever the active subscription's symbol, exchanges, or
  // contractType (driven by strategyMode) changes, so stale data never mixes
  // with the new subscription's ticks — then seed it with historical spread for
  // the new subscription. Live ticks append on top via the tick-append effect.
  useEffect(() => {
    const inSeries = inSeriesRef.current;
    const outSeries = outSeriesRef.current;
    if (!inSeries || !outSeries) return;

    inSeries.setData([]);
    outSeries.setData([]);
    pointsRef.current = [];
    currentBucketTimeRef.current = 0;

    if (!symbol || !buyExchangeName || !sellExchangeName) return;

    const controller = new AbortController();
    let stale = false;
    const { buy, sell } = contractTypesForMode(strategyMode);
    fetchSpreadHistory(
      {
        buyExchange: buyExchangeName,
        buyContractType: buy,
        sellExchange: sellExchangeName,
        sellContractType: sell,
        symbol,
      },
      controller.signal,
    )
      .then((history) => {
        if (stale) return;
        const inNow = inSeriesRef.current;
        const outNow = outSeriesRef.current;
        if (!inNow || !outNow) return;
        // Keep any live points that arrived during the fetch (all newer than
        // the last history bucket) so seeding doesn't drop them.
        const lastHistTime = history.length ? history[history.length - 1].time : -Infinity;
        const live = pointsRef.current.filter((p) => p.time > lastHistTime);
        const merged = [...history, ...live];
        pointsRef.current = merged;
        const { inPoints, outPoints } = aggregateToBuckets(merged, frequencyRef.current);
        inNow.setData(inPoints.map((p) => ({ time: p.time as UTCTimestamp, value: p.value })));
        outNow.setData(outPoints.map((p) => ({ time: p.time as UTCTimestamp, value: p.value })));
        currentBucketTimeRef.current = inPoints.length ? inPoints[inPoints.length - 1].time : 0;
      })
      .catch(() => {
        /* ignore abort / failure — the chart just shows live ticks */
      });

    return () => {
      stale = true;
      controller.abort();
    };
  }, [symbol, buyExchangeName, sellExchangeName, strategyMode]);

  const route =
    buyExchangeName && sellExchangeName ? `${buyExchangeName} → ${sellExchangeName}` : '—';

  // Clamp the tooltip inside the chart container; its content is fixed-format
  // (three short lines) so a fixed size estimate is fine without measuring.
  const tooltipX = tooltip
    ? Math.min(tooltip.x + 12, Math.max(0, containerSize.width - 150))
    : 0;
  const tooltipY = tooltip
    ? Math.min(tooltip.y + 12, Math.max(0, containerSize.height - 70))
    : 0;

  return (
    <div className="flex flex-1 flex-col overflow-hidden rounded-xl border border-bd bg-panel">
      {/* header strip */}
      <div className="flex flex-none items-center gap-5 border-b border-bd2 px-[15px] py-[11px]">
        <div className="flex items-baseline gap-[9px]">
          <span className="text-sm font-semibold">{symbol || '—'}</span>
          <span className="text-[11px] text-tx3">{route}</span>
        </div>
        <div className="flex items-baseline gap-[7px]">
          <span className="text-[10px] tracking-[0.04em] text-tx3">SPREAD</span>
          <span className="font-mono text-[19px] font-semibold text-grn">{lastIn}</span>
        </div>
        <div className="flex items-center gap-4 text-[11.5px]">
          <div className="flex items-center gap-[6px]">
            <span className="inline-block h-[2.5px] w-[14px] rounded-[2px] bg-grn" />
            <span className="text-tx2">In</span>
            <span className="font-mono text-tx">{lastIn}</span>
          </div>
          <div className="flex items-center gap-[6px]">
            <span className="inline-block h-[2.5px] w-[14px] rounded-[2px] bg-red" />
            <span className="text-tx2">Out</span>
            <span className="font-mono text-tx">{lastOut}</span>
          </div>
        </div>

        <div className="flex-1" />

        <div className="flex gap-[3px] rounded-[8px] border border-bd bg-panel2 p-[3px]">
          {CHART_FREQUENCIES.map((freq) => {
            const active = frequency === freq;
            return (
              <button
                key={freq}
                type="button"
                onClick={() => setFrequency(freq)}
                aria-pressed={active}
                className={`rounded-[5px] px-[9px] py-[4px] text-[11px] font-semibold transition-all duration-150 ${
                  active ? 'bg-brand text-white' : 'bg-transparent text-tx2 hover:text-tx'
                }`}
              >
                {freq}
              </button>
            );
          })}
        </div>
      </div>

      {/* chart body */}
      <div className="relative min-h-0 flex-1">
        <div ref={containerRef} className="absolute inset-0 font-mono" />
        {tooltip && (
          <div
            className="pointer-events-none absolute z-10 rounded-md border border-bd bg-elev px-2.5 py-2 font-mono text-[11px] leading-[1.5] shadow-lg"
            style={{ left: tooltipX, top: tooltipY }}
          >
            <div className="text-tx3">{formatTooltipTime(tooltip.time)}</div>
            <div className="text-grn">In: {fmtPct(tooltip.inValue)}</div>
            <div className="text-red">Out: {fmtPct(tooltip.outValue)}</div>
          </div>
        )}
      </div>
    </div>
  );
}
