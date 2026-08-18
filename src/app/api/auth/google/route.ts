import { NextResponse } from "next/server";

const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID;
const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? "https://votewise.com.ng";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const role = searchParams.get("role") ?? "org"; // "org" or "admin"

  // Block Google auth for platform admin login
  if (role === "admin") {
    return NextResponse.redirect(new URL("/login?admin=1", APP_URL));
  }

  if (!GOOGLE_CLIENT_ID) {
    return NextResponse.redirect(new URL("/login?error=google_not_configured", APP_URL));
  }

  const redirectUri = `${APP_URL}/api/auth/google/callback`;
  const state = Buffer.from(JSON.stringify({ role, next: searchParams.get("next") ?? "/dashboard" })).toString("base64url");

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
