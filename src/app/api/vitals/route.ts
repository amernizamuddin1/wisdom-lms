import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

const ALLOWED_METRICS = new Set([
  "CLS",
  "FCP",
  "FID",
  "INP",
  "LCP",
  "TTFB",
  "Next.js-hydration",
  "Next.js-render",
  "Next.js-route-change-to-render",
]);

export async function POST(request: Request) {
  const contentLength = Number(request.headers.get("content-length") || 0);
  if (contentLength > 4_096) {
    return new NextResponse(null, { status: 413 });
  }

  try {
    const payload = await request.json() as Record<string, unknown>;
    if (
      typeof payload.name !== "string" ||
      !ALLOWED_METRICS.has(payload.name) ||
      typeof payload.value !== "number" ||
      !Number.isFinite(payload.value)
    ) {
      return NextResponse.json({ error: "Invalid metric" }, { status: 400 });
    }

    console.info("web-vital", {
      ...payload,
      deployment: process.env.VERCEL_GIT_COMMIT_SHA?.slice(0, 12) || "local",
    });
    return new NextResponse(null, { status: 204 });
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }
}
