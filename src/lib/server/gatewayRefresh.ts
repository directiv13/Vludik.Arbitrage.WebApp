import { createHash } from "node:crypto";
import type { IronSession } from "iron-session";
import { destroySession, saveSession, type SessionData } from "@/lib/server/session";
import { refreshTokens, IdentityAuthError } from "@/lib/server/identityClient";

export type RefreshOutcome =
  | { ok: true; accessToken: string }
  | { ok: false; status: 401; reason: "invalid_refresh" }
  | { ok: false; status: 503; reason: "identity_unavailable" };

/**
 * Coalesces concurrent refreshes for the same session within this server process only.
 * Keyed by a hash of the current refresh token. Under multi-instance/serverless
 * deployment this only coalesces requests landing on the same instance — it is
 * defense-in-depth on top of the client-side single-flight in lib/apiClient.ts, not a
 * cross-instance guarantee (would need an external lock/lease for that).
 */
const inFlight = new Map<string, Promise<RefreshOutcome>>();

function keyFor(refreshToken: string): string {
  return createHash("sha256").update(refreshToken).digest("hex");
}

export async function coordinatedRefresh(
  session: IronSession<SessionData>
): Promise<RefreshOutcome> {
  const token = session.refreshToken;
  if (!token) {
    return { ok: false, status: 401, reason: "invalid_refresh" };
  }

  const key = keyFor(token);
  let pending = inFlight.get(key);
  if (!pending) {
    pending = doRefresh(token).finally(() => inFlight.delete(key));
    inFlight.set(key, pending);
  }
  return pending;
}

async function doRefresh(refreshToken: string): Promise<RefreshOutcome> {
  try {
    const result = await refreshTokens(refreshToken);
    await saveSession({
      accessToken: result.accessToken,
      refreshToken: result.refreshToken,
      accessTokenExpiresAt: result.accessTokenExpiresAt,
    });
    return { ok: true, accessToken: result.accessToken };
  } catch (err) {
    if (err instanceof IdentityAuthError) {
      await destroySession();
      return { ok: false, status: 401, reason: "invalid_refresh" };
    }
    // Transient (network/5xx) — session stays intact.
    return { ok: false, status: 503, reason: "identity_unavailable" };
  }
}
