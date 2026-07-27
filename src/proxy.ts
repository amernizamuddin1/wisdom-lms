import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { resolveTenantFromHost } from "@/lib/tenant-resolver";

// Server-to-server endpoints (payment gateway webhooks, cron triggers) are
// hit directly by Razorpay/Vercel Cron on whatever host the deployment is
// reachable at — not on any tenant's subdomain — and resolve their own
// tenant from the request payload / a cron secret instead of the host. They
// must bypass tenant-host resolution entirely rather than 404 or silently
// fall back to the dev default tenant.
function isTenantExemptPath(pathname: string): boolean {
  return (
    pathname.startsWith("/api/webhooks") ||
    pathname.startsWith("/api/cron") ||
    pathname === "/api/vitals"
  );
}

function hasSupabaseAuthCookie(request: NextRequest): boolean {
  return request.cookies
    .getAll()
    .some(({ name }) => name.startsWith("sb-") && name.includes("-auth-token"));
}

export async function proxy(request: NextRequest) {
  if (isTenantExemptPath(request.nextUrl.pathname)) {
    return NextResponse.next();
  }

  const tenantStartedAt = performance.now();
  const host = request.headers.get("host") ?? "";
  const tenant = await resolveTenantFromHost(host);
  const tenantDuration = performance.now() - tenantStartedAt;

  if (!tenant) {
    return new NextResponse("Unknown host — no tenant is configured for this domain.", {
      status: 404,
    });
  }

  if (tenant.status !== "ACTIVE") {
    return new NextResponse(
      tenant.status === "PAUSED"
        ? "This site is temporarily paused. Please check back later."
        : "This site is no longer available.",
      { status: 503 },
    );
  }

  const requestHeaders = new Headers(request.headers);
  requestHeaders.set("x-tenant-id", tenant.id);
  requestHeaders.set("x-tenant-slug", tenant.slug);

  let response = NextResponse.next({ request: { headers: requestHeaders } });

  // Anonymous requests have no session to refresh. Skipping Supabase here keeps
  // public catalogs, product pages, and auth pages off the remote auth critical
  // path. Secure authorization remains in requireUser/requireAdmin near the data
  // access it protects.
  if (hasSupabaseAuthCookie(request)) {
    const authStartedAt = performance.now();
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() {
            return request.cookies.getAll();
          },
          setAll(cookiesToSet) {
            cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
            response = NextResponse.next({ request: { headers: requestHeaders } });
            cookiesToSet.forEach(({ name, value, options }) =>
              response.cookies.set(name, value, options),
            );
          },
        },
      },
    );
    await supabase.auth.getUser();
    response.headers.append("Server-Timing", `auth;dur=${(performance.now() - authStartedAt).toFixed(1)}`);
  }

  response.headers.append("Server-Timing", `tenant;dur=${tenantDuration.toFixed(1)}`);
  if (process.env.VERCEL_GIT_COMMIT_SHA) {
    response.headers.set("x-deployment-sha", process.env.VERCEL_GIT_COMMIT_SHA.slice(0, 12));
  }
  return response;
}

export const config = {
  // Runs on effectively every route (previously just /admin/:path*) since
  // tenant resolution has to happen before any page, layout, route handler,
  // or server action can safely query tenant-scoped data. Static assets,
  // Next's own internals, and image optimization are excluded.
  matcher: ["/((?!_next/static|_next/image|favicon.ico|sitemap.xml|robots.txt).*)"],
};
