import { ContractType } from '@/types/ws';

/** Available exchanges per contract type. From `GET /api/market/venues`. */
export interface Venues {
  spot: string[];
  perpetual: string[];
}

/** One historical spread bucket. From `GET /api/market/history-spread`. */
export interface SpreadHistoryPoint {
  timestamp: number; // unix seconds
  in: number; // in-spread percentage
  out: number; // out-spread percentage
}

export interface SpreadHistoryResponse {
  data: SpreadHistoryPoint[];
}

/** Params for a spread-history request; contract types come from the strategy mode. */
export interface SpreadHistoryQuery {
  buyExchange: string;
  buyContractType: ContractType;
  sellExchange: string;
  sellContractType: ContractType;
  symbol: string;
}
