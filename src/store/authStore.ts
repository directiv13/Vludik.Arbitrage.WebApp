import { create } from 'zustand';
import type { AuthUser } from '@/types/auth';

interface AuthState {
  user: AuthUser | null;
  isAuthenticated: boolean;
  loading: boolean;
  setSession: (user: AuthUser | null) => void;
  clear: () => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  isAuthenticated: false,
  loading: true,
  setSession: (user) => set({ user, isAuthenticated: user !== null, loading: false }),
  clear: () => set({ user: null, isAuthenticated: false, loading: false }),
}));
