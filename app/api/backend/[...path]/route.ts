import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

const BACKEND_BASE = (
  process.env.ONBOARD_BACKEND_URL ||
  process.env.NEXT_PUBLIC_ONBOARD_BACKEND_URL ||
  "https://hfg-onboard.onrender.com"
).replace(/\/$/, "");

async function proxy(request: NextRequest, pathSegments: string[]): Promise<NextResponse> {
  if (!pathSegments.length) {
    return NextResponse.json({ error: "Missing backend path" }, { status: 400 });
  }

  const query = new URL(request.url).search || "";
  const targetUrl = `${BACKEND_BASE}/api/${pathSegments.join("/")}${query}`;

  const method = request.method.toUpperCase();
  const headers = new Headers();
  headers.set("accept", "application/json");

  const adminKey = process.env.SUPER_ADMIN_API_KEY;
  if (pathSegments[0] === "admin" && adminKey) {
    headers.set("x-admin-key", adminKey);
  }

  const authHeader = request.headers.get("authorization");
  if (authHeader) {
    headers.set("authorization", authHeader);
  }

  let body: BodyInit | undefined;
  if (!["GET", "HEAD"].includes(method)) {
    const contentType = request.headers.get("content-type") || "";
    if (contentType.includes("multipart/form-data")) {
      body = await request.formData();
    } else {
      const text = await request.text();
      if (text) {
        body = text;
        headers.set("content-type", contentType || "application/json");
      }
    }
  }

  try {
    const upstream = await fetch(targetUrl, {
      method,
      headers,
      body,
      cache: "no-store",
    });

    const responseText = await upstream.text();
    const responseHeaders = new Headers();
    responseHeaders.set(
      "content-type",
      upstream.headers.get("content-type") || "application/json"
    );

    return new NextResponse(responseText, {
      status: upstream.status,
      headers: responseHeaders,
    });
  } catch (error) {
    return NextResponse.json(
      {
        error: "Upstream proxy failed",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 502 }
    );
  }
}

async function handle(request: NextRequest, context: { params: Promise<{ path: string[] }> }) {
  const params = await context.params;
  const pathSegments = params.path || [];
  return proxy(request, pathSegments);
}

export { handle as GET, handle as POST, handle as PUT, handle as PATCH, handle as DELETE, handle as OPTIONS };
