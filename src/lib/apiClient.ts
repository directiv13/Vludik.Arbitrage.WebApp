'use client';

import { useAuthStore } from '@/store/authStore';

/**
 * Single-flight guard: concurrent 401s from multiple in-flight apiFetch calls share
 * exactly one /api/auth/refresh call. Never call apiFetch from within this function or
 * from /api/auth/* callers (useAuth.ts) — that would recurse into the refresh logic.
 */
let refreshPromise: Promise<boolean> | null = null;

function requestRefresh(): Promise<boolean> {
  if (!refreshPromise) {
    refreshPromise = fetch('/api/auth/refresh', {
      method: 'POST',
      credentials: 'same-origin',
    })
      .then((res) => res.ok)
      .catch(() => false)
      .finally(() => {
        refreshPromise = null;
      });
  }
  return refreshPromise;
}

/**
 * Fetches a same-origin /api/gw/<path> route (the BFF proxy), which attaches the
 * session's access token server-side. On a 401, coordinates a single refresh per burst
 * and retries the request once — whether the refresh succeeded (fresh token) or failed
 * (a concurrent refresh in another tab may have already rotated the shared session
 * cookie). Only if that retry is still 401 does it clear client auth state and redirect
 * to /login. Caps at one refresh + one retry; never loops.
 */
export async function apiFetch(path: string, init: RequestInit = {}): Promise<Response> {
  const url = `/api/gw/${path.replace(/^\/+/, '')}`;
  const doFetch = () => fetch(url, { ...init, credentials: 'same-origin' });

  let response = await doFetch();
  if (response.status !== 401) return response;

  await requestRefresh();
  response = await doFetch();
  if (response.status !== 401) return response;

  useAuthStore.getState().clear();
  if (typeof window !== 'undefined') {
    window.location.assign('/login');
  }
  return response;
}
