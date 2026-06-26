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
  // mixes data from a previous subscription with the new one.
  setStrategyMode: (mode) =>
    set({ strategyMode: mode, latestBuyTick: null, latestSellTick: null }),
  setSymbol: (symbol) => set({ symbol, latestBuyTick: null, latestSellTick: null }),
  setExchanges: (buy, sell) =>
    set({
      buyExchangeName: buy,
      sellExchangeName: sell,
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
