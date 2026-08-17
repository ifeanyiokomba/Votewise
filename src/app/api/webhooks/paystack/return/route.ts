import { NextResponse } from "next/server";

/**
 * Paystack redirects here after checkout. This is a user-facing redirect
 * back to the dashboard. The actual payment confirmation happens via the
 * POST webhook at /api/webhooks/paystack (same route, different method).
 */
export async function GET(request: Request) {
  const url = new URL(request.url);
  const reference = url.searchParams.get("reference");
  const status = url.searchParams.get("status");

  // Redirect to the activate page with payment status
  // The page will poll the activation API and show celebration when confirmed
  const target = reference
    ? `/dashboard?payment_status=${status ?? "processing"}&reference=${reference}`
    : "/dashboard";

  return NextResponse.redirect(new URL(target, request.url));
}
