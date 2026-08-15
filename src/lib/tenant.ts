import { type NextRequest } from "next/server";

export interface TenantContext {
  organizationId: string;
  slug: string;
}

const MAIN_DOMAIN = process.env.NEXT_PUBLIC_APP_DOMAIN ?? "votewise.com.ng";

export function resolveTenantSlugFromRequest(request: NextRequest): string | null {
  const url = new URL(request.url);
  const host = url.hostname;

  if (host === MAIN_DOMAIN || host === `www.${MAIN_DOMAIN}`) {
    return null;
  }

  const parts = host.replace(`.${MAIN_DOMAIN}`, "").split(".");

  if (
    parts.length === 1 &&
    !["www", "api", "admin", "docs", "status"].includes(parts[0])
  ) {
    return parts[0];
  }

  return null;
}

const PUBLIC_ROUTES = [
  "/",
  "/login",
  "/register",
  "/forgot-password",
  "/reset-password",
  "/verify-email",
  "/verify-ballot",
  "/pricing",
  "/api/auth",
  "/api/webhooks",
  "/api/health",
  "/api/public",
  "/api/voter/verify",
  "/api/voter/vote",
  "/api/voter/vote/cast",
  "/api/voter/ballot-status",
  "/api/voter/receipt",
  "/vote",
  "/results",
  "/observe",
  "/report",
  "/certificate",
  "/verify-ballot",
  "/_next",
  "/favicon.ico",
];

export function isProtectedRoute(pathname: string): boolean {
  return !PUBLIC_ROUTES.some(
    (route) => pathname === route || pathname.startsWith(route + "/")
  );
}

export function isApiRoute(pathname: string): boolean {
  return pathname.startsWith("/api/");
}
