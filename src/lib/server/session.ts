import { cookies } from "next/headers";
import {
  getIronSession,
  type IronSession,
  type SessionOptions,
} from "iron-session";
import type { AuthUser } from "@/types/auth";

export interface SessionData {
  accessToken?: string;
  refreshToken?: string;
  user?: AuthUser;
  accessTokenExpiresAt?: number;
}

// Computed lazily (not at module scope) so that importing this module — which
// happens when Next.js collects page data for every route during `next build`
// — doesn't require SESSION_SECRET to be present at build time. It's a
// request-time-only var, supplied when the container is run (see CLAUDE.md).
function getSessionOptions(): SessionOptions {
  if (!process.env.SESSION_SECRET || process.env.SESSION_SECRET.length < 32) {
    throw new Error(
      "SESSION_SECRET must be set and at least 32 characters long"
    );
  }

  return {
    password: process.env.SESSION_SECRET,
    cookieName: process.env.SESSION_COOKIE_NAME ?? "arbor_session",
    cookieOptions: {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
    },
    ...(process.env.SESSION_TTL_SECONDS
      ? { ttl: Number(process.env.SESSION_TTL_SECONDS) }
      : {}),
  };
}

export async function getSession(): Promise<IronSession<SessionData>> {
  return getIronSession<SessionData>(await cookies(), getSessionOptions());
}

export async function saveSession(
  data: Partial<SessionData>
): Promise<IronSession<SessionData>> {
  const session = await getSession();
  Object.assign(session, data);
  await session.save();
  return session;
}

export async function destroySession(): Promise<void> {
  const session = await getSession();
  session.destroy();
}

export async function getAccessToken(): Promise<string | null> {
  const session = await getSession();
  return session.accessToken ?? null;
}

export async function isAuthenticated(): Promise<boolean> {
  return (await getAccessToken()) !== null;
}
