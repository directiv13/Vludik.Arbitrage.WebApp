import { NextRequest, NextResponse } from "next/server";
import { csrfGuard } from "@/lib/server/csrf";
import { destroySession, getSession, saveSession } from "@/lib/server/session";
import { refreshTokens, IdentityAuthError } from "@/lib/server/identityClient";

export async function POST(request: NextRequest) {
  const csrfError = csrfGuard(request);
  if (csrfError) return csrfError;

  const session = await getSession();
  if (!session.refreshToken) {
    return NextResponse.json({ error: "no_session" }, { status: 401 });
  }

  try {
    const result = await refreshTokens(session.refreshToken);
    await saveSession({
      accessToken: result.accessToken,
      refreshToken: result.refreshToken,
      accessTokenExpiresAt: result.accessTokenExpiresAt,
      user: result.user ?? session.user,
    });
    return NextResponse.json({ ok: true });
  } catch (err) {
    if (err instanceof IdentityAuthError) {
      await destroySession();
      return NextResponse.json({ error: "invalid_refresh" }, { status: 401 });
    }
    return NextResponse.json({ error: "identity_unavailable" }, { status: 503 });
  }
}
