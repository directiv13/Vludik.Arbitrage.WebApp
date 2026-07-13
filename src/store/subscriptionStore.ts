import { create } from 'zustand';
import { Tick, ExchangeRef, ContractType } from '@/types/ws';

export type StrategyMode = 'long-short' | 'spot-short';

interface SideContractTypes {
  buy: ContractType;
  sell: ContractType;
}

/**
 * Maps the active strategy mode to the contractType used for each side of the
 * spread. Used both to route incoming ticks and to build subscribe messages.
 */
const STRATEGY_CONTRACT_TYPES: Record<StrategyMode, SideContractTypes> = {
  'long-short': { buy: 'perpetual', sell: 'perpetual' },
  'spot-short': { buy: 'spot', sell: 'perpetual' },
};

/** The per-side contract types for a strategy mode — used by the header/rail to
 * pick which venue and symbol lists apply to each side. */
export function contractTypesForMode(mode: StrategyMode): SideContractTypes {
  return STRATEGY_CONTRACT_TYPES[mode];
}

interface SubscriptionState {
  strategyMode: StrategyMode;
  symbol: string;
  buyExchangeName: string;
  sellExchangeName: string;
  latestBuyTick: Tick | null;
  latestSellTick: Tick | null;

  setStrategyMode: (mode: StrategyMode) => void;
  setSymbol: (symbol: string) => void;
  setExchanges: (buy: string, sell: string) => void;
  setBuyExchange: (name: string) => void;
  setSellExchange: (name: string) => void;
  setTick: (tick: Tick) => void;
}

export const useSubscriptionStore = create<SubscriptionState>((set, get) => ({
  strategyMode: 'long-short',
  symbol: '',
  buyExchangeName: '',
  sellExchangeName: '',
  latestBuyTick: null,
  latestSellTick: null,

  // Changing any subscription parameter clears stale ticks so the chart never
  // mixes data from a previous subscription with the new one. A mode or exchange
  // change also clears `symbol`, which drives the WS hook to unsubscribe and the
  // rail to reset its symbol selection (the new contract type / exchange has a
  // different set of available symbols).
  setStrategyMode: (mode) =>
    set({ strategyMode: mode, symbol: '', latestBuyTick: null, latestSellTick: null }),
  setSymbol: (symbol) => set({ symbol, latestBuyTick: null, latestSellTick: null }),
  setExchanges: (buy, sell) =>
    set({
      buyExchangeName: buy,
      sellExchangeName: sell,
      latestBuyTick: null,
      latestSellTick: null,
    }),
  setBuyExchange: (name) =>
    set({
      buyExchangeName: name,
      symbol: '',
      latestBuyTick: null,
      latestSellTick: null,
    }),
  setSellExchange: (name) =>
    set({
      sellExchangeName: name,
      symbol: '',
      latestBuyTick: null,
      latestSellTick: null,
    }),

  setTick: (tick) => {
    const state = get();
    const { buy, sell } = STRATEGY_CONTRACT_TYPES[state.strategyMode];
    if (tick.exchange === state.buyExchangeName && tick.contractType === buy) {
      set({ latestBuyTick: tick });
    } else if (tick.exchange === state.sellExchangeName && tick.contractType === sell) {
      set({ latestSellTick: tick });
    }
    // Ticks that match neither side (stale subscription, unknown exchange) are ignored.
  },
}));

/**
 * Derives the full ExchangeRef objects for the current store state. Used by the
 * WebSocket hook when building subscribe / unsubscribe messages.
 */
export function getExchangeRefs(state: SubscriptionState): {
  buyExchange: ExchangeRef;
  sellExchange: ExchangeRef;
} {
  const { buy, sell } = STRATEGY_CONTRACT_TYPES[state.strategyMode];
  return {
    buyExchange: { name: state.buyExchangeName, contractType: buy },
    sellExchange: { name: state.sellExchangeName, contractType: sell },
  };
}
