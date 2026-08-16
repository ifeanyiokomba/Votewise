import { type NextRequest } from "next/server";
import { db } from "@/lib/db";

export interface TenantContext {
  organizationId: string;
  slug: string;
  domain?: string | null;
}

const MAIN_DOMAIN = process.env.NEXT_PUBLIC_APP_DOMAIN ?? "votewise.com.ng";
const RESERVED_SUBDOMAINS = ["www", "api", "admin", "docs", "status"];

/**
 * Resolve the tenant (organization) from the request's host.
 *
 * Supports two modes:
 * 1. Subdomain: unilag.votewise.com.ng → slug "unilag"
 * 2. Custom domain: elections.unilag.edu.ng → looks up org by domain
 *
 * Returns null for the main domain (votewise.com.ng) and admin subdomain.
 */
export function resolveTenantSlugFromHost(host: string): string | null {
  // Main domain or www — no tenant
  if (host === MAIN_DOMAIN || host === `www.${MAIN_DOMAIN}`) {
    return null;
  }

  // Admin subdomain — handled separately
  if (host === `admin.${MAIN_DOMAIN}`) {
    return null;
  }

  // Check if it's a subdomain of the main domain
  if (host.endsWith(`.${MAIN_DOMAIN}`)) {
    const subdomain = host.replace(`.${MAIN_DOMAIN}`, "");
    if (
      subdomain &&
      !RESERVED_SUBDOMAINS.includes(subdomain) &&
      !subdomain.includes(".")
    ) {
      return subdomain;
    }
  }

  // It might be a custom domain — return the full host for DB lookup
  return null;
}

/**
 * Resolve the organization by checking if the host matches a custom domain.
 * Called after the subdomain check fails.
 */
export async function resolveTenantByCustomDomain(
  host: string
): Promise<TenantContext | null> {
  try {
    const org = await db.organization.findFirst({
      where: { domain: host },
      select: { id: true, slug: true, domain: true },
    });
    if (!org) return null;
    return { organizationId: org.id, slug: org.slug, domain: org.domain };
  } catch {
    return null;
  }
}

/**
 * Full tenant resolution — checks subdomain first, then custom domain.
 */
export async function resolveTenant(
  request: NextRequest
): Promise<TenantContext | null> {
  const url = new URL(request.url);
  const host = url.hostname;

  // Check subdomain
  const slug = resolveTenantSlugFromHost(host);
  if (slug) {
    // Look up the org by slug
    try {
      const org = await db.organization.findUnique({
        where: { slug },
        select: { id: true, slug: true, domain: true },
      });
      if (org) {
        return { organizationId: org.id, slug: org.slug, domain: org.domain };
      }
    } catch {
      // ignore DB errors in middleware
    }
  }

  // Check custom domain
  const customDomainTenant = await resolveTenantByCustomDomain(host);
  if (customDomainTenant) return customDomainTenant;

  return null;
}

/**
 * Check if the host is the admin subdomain (admin.votewise.com.ng).
 */
export function isAdminSubdomain(host: string): boolean {
  return host === `admin.${MAIN_DOMAIN}`;
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
  "/api/auth/google",
  "/api/auth/google/callback",
  "/api/webhooks",
  "/api/health",
  "/api/public",
  "/api/public/verify-certificate",
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
  "/org",
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
