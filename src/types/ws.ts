export type ContractType = 'spot' | 'perpetual';

export interface ExchangeRef {
  name: string;
  contractType: ContractType;
}

export interface SubscribeMessage {
  action: 'subscribe';
  params: {
    symbol: string;
    buyExchange: ExchangeRef;
    sellExchange: ExchangeRef;
  };
}

export interface UnsubscribeMessage {
  action: 'unsubscribe';
  params: {
    symbol: string;
    buyExchange: ExchangeRef;
    sellExchange: ExchangeRef;
  };
}

export interface PingMessage {
  action: 'ping';
}

export type ClientMessage = SubscribeMessage | UnsubscribeMessage | PingMessage;

export interface Tick {
  exchange: string;
  symbol: string;
  contractType: ContractType;
  bestBid: number;
  bestAsk: number;
  timestamp: number; // epoch ms
}

/**
 * Parses and normalizes an incoming WebSocket frame into a `Tick`, or returns
 * `null` if it isn't one. The Subscriptions Service sends PascalCase keys and
 * capitalized contract-type values (e.g. `{ Exchange, ContractType: "Spot", ... }`)
 * — this maps that wire shape onto the lowerCamelCase `Tick` used internally.
 */
export function parseTick(value: unknown): Tick | null {
  if (typeof value !== 'object' || value === null) {
    return null;
  }
  const v = value as Record<string, unknown>;
  if (
    typeof v.Exchange !== 'string' ||
    typeof v.Symbol !== 'string' ||
    (v.ContractType !== 'Spot' && v.ContractType !== 'Perpetual') ||
    typeof v.BestBid !== 'number' ||
    typeof v.BestAsk !== 'number' ||
    typeof v.Timestamp !== 'number'
  ) {
    return null;
  }
  return {
    exchange: v.Exchange,
    symbol: v.Symbol,
    contractType: v.ContractType === 'Spot' ? 'spot' : 'perpetual',
    bestBid: v.BestBid,
    bestAsk: v.BestAsk,
    timestamp: v.Timestamp,
  };
}
