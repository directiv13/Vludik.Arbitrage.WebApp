'use client';

import { useEffect } from 'react';
import { useAuthStore } from '@/store/authStore';
import type { AuthUser } from '@/types/auth';

interface SessionResponse {
  isAuthenticated: boolean;
  user: AuthUser | null;
}

/** Bootstraps client auth state once on mount by reading the session from the BFF. */
export function AuthProvider({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    let cancelled = false;
    fetch('/api/auth/session', { credentials: 'same-origin' })
      .then((res) => res.json() as Promise<SessionResponse>)
      .then((data) => {
        if (!cancelled) useAuthStore.getState().setSession(data.user);
      })
      .catch(() => {
        if (!cancelled) useAuthStore.getState().setSession(null);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  return <>{children}</>;
}
