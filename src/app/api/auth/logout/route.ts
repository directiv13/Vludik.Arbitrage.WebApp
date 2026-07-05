import { NextRequest, NextResponse } from "next/server";
import { csrfGuard } from "@/lib/server/csrf";
import { destroySession, getSession } from "@/lib/server/session";
import { revokeRefreshToken } from "@/lib/server/identityClient";

export async function POST(request: NextRequest) {
  const csrfError = csrfGuard(request);
  if (csrfError) return csrfError;

  const session = await getSession();
  if (session.refreshToken) {
    await revokeRefreshToken(session.refreshToken);
  }
  await destroySession();
  return NextResponse.json({ ok: true });
}
