import { NextRequest, NextResponse } from "next/server";

// No-auth BFF proxy for the market data endpoints (venues, symbols,
// history-spread). Unlike `/api/gw/[...path]`, this route attaches no session /
// Bearer token and never requires a login — the market endpoints are public.
// It exists so the browser only ever calls same-origin `/api/market/*` and
// `API_GATEWAY_URL` stays server-only. GET-only: every market endpoint is a read.

const API_GATEWAY_URL = process.env.API_GATEWAY_URL;

// Headers that must not be blindly copied from the upstream response.
const HOP_BY_HOP_HEADERS = new Set([
  "connection",
  "transfer-encoding",
  "content-encoding",
  "keep-alive",
  "content-length",
]);

function buildMarketUrl(path: string[], search: string): string {
  return `${API_GATEWAY_URL}/market/${path.map(encodeURIComponent).join("/")}${search}`;
}

async function toNextResponse(upstream: Response): Promise<NextResponse> {
  const headers = new Headers();
  upstream.headers.forEach((value, key) => {
    if (!HOP_BY_HOP_HEADERS.has(key.toLowerCase())) {
      headers.set(key, value);
    }
  });
  const bodyBuffer = await upstream.arrayBuffer();
  return new NextResponse(bodyBuffer, { status: upstream.status, headers });
}

interface RouteParams {
  params: Promise<{ path: string[] }>;
}

export async function GET(request: NextRequest, { params }: RouteParams) {
  if (!API_GATEWAY_URL) {
    return NextResponse.json({ error: "gateway_not_configured" }, { status: 500 });
  }
  const { path } = await params;
  const targetUrl = buildMarketUrl(path, request.nextUrl.search);
  const upstream = await fetch(targetUrl, { method: "GET", cache: "no-store" });
  return toNextResponse(upstream);
}
