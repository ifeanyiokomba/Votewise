import { NextResponse } from "next/server";

const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID;

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const role = searchParams.get("role") ?? "org";

  // Block Google auth for platform admin login
  if (role === "admin") {
    return NextResponse.redirect(new URL("/login?admin=1", request.url));
  }

  if (!GOOGLE_CLIENT_ID) {
    return NextResponse.redirect(new URL("/login?error=google_not_configured", request.url));
  }

  // Build redirect URI from the actual request URL — ensures it always matches
  // what's registered in Google Cloud Console regardless of www/non-www
  const requestUrl = new URL(request.url);
  const origin = requestUrl.origin; // e.g. https://votewise.com.ng or https://www.votewise.com.ng
  const redirectUri = `${origin}/api/auth/google/callback`;

  const state = Buffer.from(
    JSON.stringify({ role, next: searchParams.get("next") ?? "/dashboard" })
  ).toString("base64url");

  const params = new URLSearchParams({
    client_id: GOOGLE_CLIENT_ID,
    redirect_uri: redirectUri,
    response_type: "code",
    scope: "openid email profile",
    state,
    prompt: "select_account",
  });

  return NextResponse.redirect(`https://accounts.google.com/o/oauth2/v2/auth?${params}`);
}
