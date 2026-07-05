import { NextRequest, NextResponse } from "next/server";
import { csrfGuard } from "@/lib/server/csrf";
import { destroySession, getSession } from "@/lib/server/session";
import { coordinatedRefresh } from "@/lib/server/gatewayRefresh";

const API_GATEWAY_URL = process.env.API_GATEWAY_URL;

// Headers that must not be blindly copied from the upstream response.
const HOP_BY_HOP_HEADERS = new Set([
  "connection",
  "transfer-encoding",
  "content-encoding",
  "keep-alive",
  "content-length",
]);

function buildGatewayUrl(path: string[], search: string): string {
  return `${API_GATEWAY_URL}/${path.map(encodeURIComponent).join("/")}${search}`;
}

async function forwardToGateway(
  targetUrl: string,
  method: string,
  accessToken: string,
  body: ArrayBuffer | undefined,
  requestHeaders: Headers
): Promise<Response> {
  const headers = new Headers();
  const contentType = requestHeaders.get("content-type");
  if (contentType) headers.set("content-type", contentType);
  headers.set("authorization", `Bearer ${accessToken}`);

  return fetch(targetUrl, {
    method,
    headers,
    body,
    cache: "no-store",
  });
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

async function proxy(
  request: NextRequest,
  path: string[],
  method: string
): Promise<NextResponse> {
  if (method !== "GET" && method !== "HEAD") {
    const csrfError = csrfGuard(request);
    if (csrfError) return csrfError;
  }

  const session = await getSession();
  if (!session.accessToken) {
    return NextResponse.json({ error: "unauthenticated" }, { status: 401 });
  }

  const targetUrl = buildGatewayUrl(path, request.nextUrl.search);
  const bodyBuffer =
    method === "GET" || method === "HEAD" || method === "DELETE"
      ? undefined
      : await request.arrayBuffer();

  let upstream = await forwardToGateway(
    targetUrl,
    method,
    session.accessToken,
    bodyBuffer,
    request.headers
  );

  if (upstream.status === 401) {
    const refreshOutcome = await coordinatedRefresh(session);

    if (!refreshOutcome.ok) {
      return NextResponse.json(
        { error: refreshOutcome.reason },
        { status: refreshOutcome.status }
      );
    }

    upstream = await forwardToGateway(
      targetUrl,
      method,
      refreshOutcome.accessToken,
      bodyBuffer,
      request.headers
    );

    if (upstream.status === 401) {
      // The gateway rejected a token Identity just confirmed as valid. Treated
      // conservatively as a broken session rather than surfacing a bare 401 the
      // client can't recover from.
      await destroySession();
      return NextResponse.json(
        { error: "session_rejected_by_gateway" },
        { status: 401 }
      );
    }
  }

  return toNextResponse(upstream);
}

interface RouteParams {
  params: Promise<{ path: string[] }>;
}

export async function GET(request: NextRequest, { params }: RouteParams) {
  const { path } = await params;
  return proxy(request, path, "GET");
}
export async function POST(request: NextRequest, { params }: RouteParams) {
  const { path } = await params;
  return proxy(request, path, "POST");
}
export async function PUT(request: NextRequest, { params }: RouteParams) {
  const { path } = await params;
  return proxy(request, path, "PUT");
}
export async function PATCH(request: NextRequest, { params }: RouteParams) {
  const { path } = await params;
  return proxy(request, path, "PATCH");
}
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  const { path } = await params;
  return proxy(request, path, "DELETE");
}
