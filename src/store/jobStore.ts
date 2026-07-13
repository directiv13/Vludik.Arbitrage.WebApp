import { create } from 'zustand';
import { JobType, MarginType } from '@/types/jobs';

export type SubmitState = 'idle' | 'pending' | 'success' | 'error';

/**
 * Holds ONLY the rail's job-config form state. Symbol / exchange / strategy live
 * in `subscriptionStore` and are read via selectors — never duplicated here.
 * Numeric inputs are kept as raw strings so a user can type `0.` mid-entry;
 * they're parsed to numbers only at the validation / submit boundary
 * (`validateJobForm` / `buildJobPayload`). Derived values (notional, chunk count,
 * validity) are computed in selectors/helpers, not stored.
 */
interface JobFormState {
  type: JobType;
  marginType: MarginType;
  leverage: number;
  size: string;
  chunkSize: string;
  spreadPerc: string;
  submitState: SubmitState;
  submitError: string | null;

  setType: (type: JobType) => void;
  setMarginType: (marginType: MarginType) => void;
  setLeverage: (leverage: number) => void;
  setSize: (size: string) => void;
  setChunkSize: (chunkSize: string) => void;
  setSpreadPerc: (spreadPerc: string) => void;
  setSubmitState: (submitState: SubmitState, submitError?: string | null) => void;
  reset: () => void;
}

const INITIAL = {
  type: 'open' as JobType,
  marginType: 'cross' as MarginType,
  leverage: 10,
  size: '',
  chunkSize: '',
  spreadPerc: '',
  submitState: 'idle' as SubmitState,
  submitError: null,
};

export const useJobStore = create<JobFormState>((set) => ({
  ...INITIAL,

  setType: (type) => set({ type }),
  setMarginType: (marginType) => set({ marginType }),
  setLeverage: (leverage) => set({ leverage }),
  setSize: (size) => set({ size }),
  setChunkSize: (chunkSize) => set({ chunkSize }),
  setSpreadPerc: (spreadPerc) => set({ spreadPerc }),
  // Setting any state other than an error clears a stale error message.
  setSubmitState: (submitState, submitError = null) => set({ submitState, submitError }),
  reset: () => set({ ...INITIAL }),
}));
