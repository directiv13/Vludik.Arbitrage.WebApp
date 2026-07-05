import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const COOKIE_NAME = process.env.SESSION_COOKIE_NAME ?? "arbor_session";
const LOGIN_PATH = "/login";

/**
 * Fast, non-authoritative cookie-presence check to avoid a flash of the wrong page.
 * The sealed cookie is not unsealed/validated here (that requires next/headers'
 * cookies() store, which isn't available in Proxy) — authoritative validation happens
 * in route handlers (getSession()/getAccessToken()) and via the gateway rejecting a
 * stale/forged token, which flows through the refresh-or-destroy logic in
 * lib/server/gatewayRefresh.ts.
 */
export function proxy(request: NextRequest) {
  const hasSession = request.cookies.has(COOKIE_NAME);
  const isLoginPath = request.nextUrl.pathname === LOGIN_PATH;

  if (!hasSession && !isLoginPath) {
    const url = request.nextUrl.clone();
    url.pathname = LOGIN_PATH;
    return NextResponse.redirect(url);
  }
  if (hasSession && isLoginPath) {
    const url = request.nextUrl.clone();
    url.pathname = "/";
    return NextResponse.redirect(url);
  }
  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico).*)"],
};
