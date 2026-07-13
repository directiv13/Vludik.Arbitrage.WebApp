import { ContractType } from '@/types/ws';

export type JobType = 'open' | 'close';
export type MarginType = 'cross' | 'isolated';

/** One leg of a job — an exchange name plus its derived contract type. */
export interface JobExchange {
  name: string;
  contractType: ContractType;
}

/**
 * Body of `POST /api/gw/jobs`. All numeric fields are sent as numbers (never
 * strings) and `symbol` is unslashed (e.g. `BTCUSDT`). `contractType` on each
 * leg is derived from the active strategy mode, not user input.
 */
export interface CreateJobRequest {
  symbol: string;
  buyExchange: JobExchange;
  sellExchange: JobExchange;
  type: JobType;
  spreadPerc: number;
  size: number;
  chunkSize: number; // <= size
  marginType: MarginType;
  leverage: number; // integer, 1 - 500
}

/**
 * Response of `POST /api/gw/jobs`. The flow only guarantees `200 OK`, so the
 * shape is treated as best-effort — everything is optional.
 */
export interface CreateJobResponse {
  id?: string;
}

/**
 * Thrown by `createJob` on any non-2xx response (or a network failure). Carries
 * a user-facing message and, when available, the HTTP status. Keeping this in
 * the client means the rail component never touches HTTP directly.
 */
export class JobError extends Error {
  status?: number;

  constructor(message: string, status?: number) {
    super(message);
    this.name = 'JobError';
    this.status = status;
  }
}
