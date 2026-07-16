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
  return pathname.startsWith("/api/webhooks") || pathname.startsWith("/api/cron");
}

export async function proxy(request: NextRequest) {
  if (isTenantExemptPath(request.nextUrl.pathname)) {
    return NextResponse.next();
  }

  const host = request.headers.get("host") ?? "";
  const tenant = await resolveTenantFromHost(host);

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

  // getUser() also refreshes the Supabase session cookie, so this always runs
  // (on every route) even though the admin-login redirect below only applies
  // within /admin — matching the pre-widened-matcher behavior exactly.
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (request.nextUrl.pathname.startsWith("/admin")) {
    const isLoginPage = request.nextUrl.pathname === "/admin/login";

    if (!user && !isLoginPage) {
      const url = request.nextUrl.clone();
      url.pathname = "/admin/login";
      return NextResponse.redirect(url);
    }

    if (user && isLoginPage) {
      const url = request.nextUrl.clone();
      url.pathname = "/admin";
      return NextResponse.redirect(url);
    }
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
