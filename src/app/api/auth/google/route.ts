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

  // Build the redirect URI using the actual host the user visited.
  // Vercel sets x-forwarded-host to the real domain (e.g. www.votewise.com.ng)
  // and x-forwarded-proto to the protocol (https).
  // This ensures the redirect URI always matches what's in Google Cloud Console.
  const forwardedHost = request.headers.get("x-forwarded-host");
  const forwardedProto = request.headers.get("x-forwarded-proto") ?? "https";
  const host = forwardedHost ?? new URL(request.url).host;
  const origin = `${forwardedProto}://${host}`;
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

  const googleAuthUrl = `https://accounts.google.com/o/oauth2/v2/auth?${params}`;

  return NextResponse.redirect(googleAuthUrl);
}
