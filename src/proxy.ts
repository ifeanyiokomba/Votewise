import { NextResponse, type NextRequest } from "next/server";
import { isProtectedRoute, resolveTenantSlugFromHost, resolveTenantByCustomDomain } from "@/lib/tenant";

const SESSION_COOKIE = "votewise_session";
const MAIN_DOMAIN = process.env.NEXT_PUBLIC_APP_DOMAIN ?? "votewise.com.ng";

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const host = request.headers.get("host") ?? "";
  const protocol = request.headers.get("x-forwarded-proto") ?? "https";

  // ─── Subdomain + custom domain routing ───────────────────────────
  // unilag.votewise.com.ng → rewrite to /org/unilag
  // admin.votewise.com.ng → redirect to /login?admin=1
  // elections.unilag.edu.ng (custom domain) → rewrite to /org/{slug}
  if (host !== MAIN_DOMAIN && host !== `www.${MAIN_DOMAIN}` && host !== "localhost:3000") {
    // Admin subdomain
    if (host === `admin.${MAIN_DOMAIN}`) {
      // If already logged in, go to dashboard; otherwise login with admin flag
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

    // Check if it's a subdomain of the main domain
    const slug = resolveTenantSlugFromHost(host);
    if (slug && !pathname.startsWith("/api/") && !pathname.startsWith("/_next/")) {
      // Rewrite unilag.votewise.com.ng/ → /org/unilag
      if (pathname === "/" || pathname === "") {
        return NextResponse.rewrite(new URL(`/org/${slug}`, request.url));
      }
    } else if (!pathname.startsWith("/api/") && !pathname.startsWith("/_next/") && (pathname === "/" || pathname === "")) {
      // Not a subdomain — try custom domain lookup (e.g. elections.unilag.edu.ng → /org/{slug})
      const customTenant = await resolveTenantByCustomDomain(host);
      if (customTenant?.slug) {
        return NextResponse.rewrite(new URL(`/org/${customTenant.slug}`, request.url));
      }
    }
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
