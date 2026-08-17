import { NextResponse, type NextRequest } from "next/server";
import { isProtectedRoute, resolveTenantSlugFromHost } from "@/lib/tenant";

const SESSION_COOKIE = "votewise_session";
const MAIN_DOMAIN = process.env.NEXT_PUBLIC_APP_DOMAIN ?? "votewise.com.ng";

// Note: Custom domain resolution is NOT done in the proxy because it requires
// a DB query per request — that's too expensive for middleware. Instead,
// custom domains are handled by the org page itself (it reads the host
// header and looks up the org). The proxy only does lightweight string
// parsing for subdomain routing.
export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const host = request.headers.get("host") ?? "";

  // ─── Subdomain routing (string-only, no DB) ──────────────────────
  // unilag.votewise.com.ng → rewrite to /org/unilag
  // admin.votewise.com.ng → redirect to /login?admin=1
  if (host !== MAIN_DOMAIN && host !== `www.${MAIN_DOMAIN}` && host !== "localhost:3000" && !host.startsWith("127.0.0.1")) {
    // Admin subdomain
    if (host === `admin.${MAIN_DOMAIN}`) {
      const token = request.cookies.get(SESSION_COOKIE)?.value;
      if (token && !pathname.startsWith("/dashboard")) {
        return NextResponse.redirect(new URL("/dashboard", request.url));
      }
      if (pathname === "/" || pathname === "") {
        const loginUrl = new URL("/login", request.url);
        loginUrl.searchParams.set("admin", "1");
        return NextResponse.redirect(loginUrl);
      }
      return NextResponse.next();
    }

    // Check if it's a subdomain of the main domain (string-only check)
    const slug = resolveTenantSlugFromHost(host);
    if (slug && !pathname.startsWith("/api/") && !pathname.startsWith("/_next/")) {
      if (pathname === "/" || pathname === "") {
        return NextResponse.rewrite(new URL(`/org/${slug}`, request.url));
      }
    }
    // Custom domains fall through — the /org/[slug] page handles them
  }

  // ─── Standard routing ────────────────────────────────────────────

  if (!isProtectedRoute(pathname)) {
    return NextResponse.next();
  }

  // Voter-facing routes are public
  if (
    pathname.startsWith("/vote/") ||
    pathname.startsWith("/results/") ||
    pathname.startsWith("/observe/") ||
    pathname.startsWith("/report/") ||
    pathname.startsWith("/certificate/") ||
    pathname.startsWith("/org/")
  ) {
    return NextResponse.next();
  }

  const token = request.cookies.get(SESSION_COOKIE)?.value;

  // Auth pages: if already logged in, redirect to dashboard
  if (
    (pathname === "/login" ||
      pathname === "/register" ||
      pathname === "/forgot-password" ||
      pathname.startsWith("/reset-password")) &&
    token
  ) {
    return NextResponse.redirect(new URL("/dashboard", request.url));
  }

  if (isProtectedRoute(pathname) && !token) {
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("next", pathname);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:png|jpg|jpeg|svg|gif|webp|ico)$).*)",
  ],
};
