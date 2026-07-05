import { NextRequest, NextResponse } from "next/server";
import { csrfGuard } from "@/lib/server/csrf";
import { saveSession } from "@/lib/server/session";
import { googleSignIn, IdentityAuthError } from "@/lib/server/identityClient";

export async function POST(request: NextRequest) {
  const csrfError = csrfGuard(request);
  if (csrfError) return csrfError;

  const body = await request.json().catch(() => null);
  if (!body || typeof body.idToken !== "string" || !body.idToken) {
    return NextResponse.json({ error: "missing_id_token" }, { status: 400 });
  }

  try {
    const result = await googleSignIn(body.idToken);
    await saveSession({
      accessToken: result.accessToken,
      refreshToken: result.refreshToken,
      accessTokenExpiresAt: result.accessTokenExpiresAt,
      user: result.user,
    });
    return NextResponse.json({ user: result.user ?? null });
  } catch (err) {
    if (err instanceof IdentityAuthError) {
      return NextResponse.json({ error: "invalid_id_token" }, { status: 401 });
    }
    return NextResponse.json({ error: "identity_unavailable" }, { status: 503 });
  }
}
