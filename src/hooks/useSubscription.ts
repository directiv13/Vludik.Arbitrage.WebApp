'use client';

import { useEffect, useRef } from 'react';
import { getExchangeRefs, useSubscriptionStore } from '@/store/subscriptionStore';
import { ClientMessage, parseTick, SubscribeMessage } from '@/types/ws';

const WS_URL = process.env.NEXT_PUBLIC_WS_URL ?? 'ws://localhost:8080/ws';
const PING_INTERVAL_MS = 30_000;
const RECONNECT_DELAY_MS = 2_000;

type SubscriptionParams = SubscribeMessage['params'];

function paramsEqual(
  a: SubscriptionParams | null,
  b: SubscriptionParams | null,
): boolean {
  if (a === b) return true;
  if (!a || !b) return false;
  return (
    a.symbol === b.symbol &&
    a.buyExchange.name === b.buyExchange.name &&
    a.buyExchange.contractType === b.buyExchange.contractType &&
    a.sellExchange.name === b.sellExchange.name &&
    a.sellExchange.contractType === b.sellExchange.contractType
  );
}

/** Builds subscription params from the current store state, or null if no symbol is set. */
function buildParams(): SubscriptionParams | null {
  const state = useSubscriptionStore.getState();
  if (!state.symbol) return null;
  const { buyExchange, sellExchange } = getExchangeRefs(state);
  return { symbol: state.symbol, buyExchange, sellExchange };
}

/**
 * Owns the entire WebSocket lifecycle: connect, subscribe-on-change, 30s ping,
 * reconnect-and-resubscribe, and teardown. Side-effect only — mount once at the
 * root. No component should ever touch `WebSocket` directly.
 */
export function useSubscription(): void {
  const wsRef = useRef<WebSocket | null>(null);
  const pingIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const reconnectTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isIntentionalCloseRef = useRef(false);
  const lastParamsRef = useRef<SubscriptionParams | null>(null);

  useEffect(() => {
    const send = (msg: ClientMessage): void => {
      const ws = wsRef.current;
      if (ws && ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify(msg));
      }
    };

    const clearPing = (): void => {
      if (pingIntervalRef.current !== null) {
        clearInterval(pingIntervalRef.current);
        pingIntervalRef.current = null;
      }
    };

    const startPing = (): void => {
      clearPing();
      pingIntervalRef.current = setInterval(() => send({ action: 'ping' }), PING_INTERVAL_MS);
    };

    const clearReconnect = (): void => {
      if (reconnectTimeoutRef.current !== null) {
        clearTimeout(reconnectTimeoutRef.current);
        reconnectTimeoutRef.current = null;
      }
    };

    // Diff against the last sent params: unsubscribe the previous subscription
    // (if any) and subscribe the new one. Replacing with identical params is a no-op.
    const applySubscription = (next: SubscriptionParams | null): void => {
      const prev = lastParamsRef.current;
      if (paramsEqual(prev, next)) return;
      if (prev) send({ action: 'unsubscribe', params: prev });
      if (next) send({ action: 'subscribe', params: next });
      lastParamsRef.current = next;
    };

    const connect = (): void => {
      const ws = new WebSocket(WS_URL);
      wsRef.current = ws;

      ws.onopen = () => {
        startPing();
        // (Re)subscribe to the currently configured params. Covers both the
        // initial connection and reconnect-after-drop re-subscription.
        const params = buildParams();
        if (params) {
          send({ action: 'subscribe', params });
          lastParamsRef.current = params;
        }
      };

      ws.onmessage = (event: MessageEvent) => {
        let data: unknown;
        try {
          data = JSON.parse(event.data as string);
        } catch {
          return; // malformed frame — drop silently
        }
        const tick = parseTick(data);
        if (tick) {
          useSubscriptionStore.getState().setTick(tick);
        }
      };

      ws.onclose = () => {
        clearPing();
        if (!isIntentionalCloseRef.current) {
          clearReconnect();
          reconnectTimeoutRef.current = setTimeout(connect, RECONNECT_DELAY_MS);
        }
      };

      // Errors are followed by a close event, which drives reconnect.
      ws.onerror = () => {};
    };

    const handleBeforeUnload = (): void => {
      const prev = lastParamsRef.current;
      if (prev) send({ action: 'unsubscribe', params: prev });
    };

    isIntentionalCloseRef.current = false;
    connect();
    window.addEventListener('beforeunload', handleBeforeUnload);

    // React to subscription-parameter changes in the store.
    const unsubscribeStore = useSubscriptionStore.subscribe((state, prevState) => {
      if (
        state.symbol !== prevState.symbol ||
        state.strategyMode !== prevState.strategyMode ||
        state.buyExchangeName !== prevState.buyExchangeName ||
        state.sellExchangeName !== prevState.sellExchangeName
      ) {
        applySubscription(buildParams());
      }
    });

    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
      unsubscribeStore();
      isIntentionalCloseRef.current = true;
      const prev = lastParamsRef.current;
      if (prev) send({ action: 'unsubscribe', params: prev });
      clearPing();
      clearReconnect();
      wsRef.current?.close();
      wsRef.current = null;
      lastParamsRef.current = null;
    };
  }, []);
}
