'use client';

import { useAuthStore } from '@/store/authStore';

type SignInResult = { ok: true } | { ok: false; error: string };

/**
 * Reads auth state from the Zustand store and exposes the sign-in/sign-out actions.
 * Both actions call fetch() directly (never apiFetch) so this hook's own auth calls can
 * never trigger the apiFetch refresh logic.
 */
export function useAuth() {
  const user = useAuthStore((s) => s.user);
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const loading = useAuthStore((s) => s.loading);

  const signInWithGoogle = async (idToken: string): Promise<SignInResult> => {
    try {
      const res = await fetch('/api/auth/google', {
        method: 'POST',
        credentials: 'same-origin',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ idToken }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        return {
          ok: false,
          error:
            body.error === 'invalid_id_token'
              ? 'Google sign-in was rejected. Please try again.'
              : 'Sign-in is temporarily unavailable. Please try again shortly.',
        };
      }
      const data = await res.json();
      useAuthStore.getState().setSession(data.user ?? null);
      return { ok: true };
    } catch {
      return { ok: false, error: 'Network error. Please check your connection and try again.' };
    }
  };

  const logout = async (): Promise<void> => {
    await fetch('/api/auth/logout', { method: 'POST', credentials: 'same-origin' }).catch(() => {});
    useAuthStore.getState().clear();
  };

  return { user, isAuthenticated, loading, signInWithGoogle, logout };
}
