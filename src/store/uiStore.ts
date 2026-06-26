import { create } from 'zustand';

export type RailLayout = 'right' | 'left';

/**
 * Presentational-only UI state. Kept separate from the domain
 * `subscriptionStore` so subscription logic stays free of view concerns.
 */
interface UiState {
  layout: RailLayout;
  setLayout: (layout: RailLayout) => void;
}

export const useUiStore = create<UiState>((set) => ({
  layout: 'right',
  setLayout: (layout) => set({ layout }),
}));
