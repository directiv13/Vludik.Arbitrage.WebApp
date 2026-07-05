import type { AuthUser } from "@/types/auth";

export interface IdentityAuthResult {
  accessToken: string;
  refreshToken: string;
  accessTokenExpiresAt?: number;
  user?: AuthUser;
}

/** Identity authoritatively rejected the credential/refresh token — destroy the session. */
export class IdentityAuthError extends Error {}
/** Network failure or 5xx from Identity — transient, do not destroy the session. */
export class IdentityTransientError extends Error {}

const IDENTITY_SERVICE_URL = process.env.IDENTITY_SERVICE_URL;

/**
 * Normalizes Identity's /auth/* response onto IdentityAuthResult. ASSUMPTION (per task
 * spec, unverified against the real Identity service): the response is camelCase
 * { accessToken, refreshToken, accessTokenExpiresAt?, user? }. If Identity actually
 * returns snake_case or a wrapped shape, this is the single function to change — same
 * normalize-at-the-boundary pattern as parseTick() in src/types/ws.ts.
 */
function parseIdentityAuthResult(value: unknown): IdentityAuthResult {
  const v = (value ?? {}) as Record<string, unknown>;
  return {
    accessToken: v.accessToken as string,
    refreshToken: v.refreshToken as string,
    accessTokenExpiresAt:
      typeof v.accessTokenExpiresAt === "number"
        ? v.accessTokenExpiresAt
        : undefined,
    user: v.user as AuthUser | undefined,
  };
}

async function callIdentity(
  path: string,
  body: unknown
): Promise<IdentityAuthResult> {
  let res: Response;
  try {
    res = await fetch(`${IDENTITY_SERVICE_URL}${path}`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(body),
      cache: "no-store",
    });
  } catch {
    throw new IdentityTransientError("identity_unreachable");
  }

  // ASSUMPTION (unverified): Identity signals an invalid credential/refresh token with
  // 401 or 400. Confirm against the real service before relying on this in production.
  if (res.status === 401 || res.status === 400) {
    throw new IdentityAuthError("invalid_grant");
  }
  if (!res.ok) {
    throw new IdentityTransientError(`identity_${res.status}`);
  }

  return parseIdentityAuthResult(await res.json().catch(() => null));
}

export function googleSignIn(idToken: string): Promise<IdentityAuthResult> {
  return callIdentity("/auth/google", { idToken });
}

export function refreshTokens(
  refreshToken: string
): Promise<IdentityAuthResult> {
  return callIdentity("/auth/refresh", { refreshToken });
}

export async function revokeRefreshToken(
  refreshToken: string
): Promise<void> {
  try {
    await callIdentity("/auth/logout", { refreshToken });
  } catch {
    // Best-effort — logout must always succeed locally regardless of Identity's response.
  }
}
