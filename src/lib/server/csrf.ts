import { NextResponse } from "next/server";

function isSameOrigin(request: Request): boolean {
  const secFetchSite = request.headers.get("sec-fetch-site");
  if (secFetchSite) {
    return secFetchSite === "same-origin" || secFetchSite === "none";
  }
  // Fallback for requests without Sec-Fetch-Site: compare Origin to the request URL.
  const origin = request.headers.get("origin");
  if (!origin) return false;
  return origin === new URL(request.url).origin;
}

/** Reject cross-site mutating requests. Call as the first line of every non-GET route handler. */
export function csrfGuard(request: Request): NextResponse | null {
  if (!isSameOrigin(request)) {
    return NextResponse.json({ error: "cross_origin_forbidden" }, { status: 403 });
  }
  return null;
}
