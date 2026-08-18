import { NextResponse } from "next/server";

/**
 * Debug endpoint to check what redirect URI Google auth would use.
 * Visit /api/auth/google/debug to see the exact redirect URI.
 */
export async function GET(request: Request) {
  const forwardedHost = request.headers.get("x-forwarded-host");
  const forwardedProto = request.headers.get("x-forwarded-proto") ?? "https";
  const requestUrl = new URL(request.url);

  const host = forwardedHost ?? requestUrl.host;
  const origin = `${forwardedProto}://${host}`;
  const redirectUri = `${origin}/api/auth/google/callback`;

  return NextResponse.json({
    redirectUri,
    requestUrl: requestUrl.toString(),
    requestOrigin: requestUrl.origin,
    forwardedHost,
    forwardedProto,
    computedHost: host,
    computedOrigin: origin,
    googleClientIdSet: !!process.env.GOOGLE_CLIENT_ID,
    googleClientSecretSet: !!process.env.GOOGLE_CLIENT_SECRET,
    registeredUrisShouldInclude: [
      "https://votewise.com.ng/api/auth/google/callback",
      "https://www.votewise.com.ng/api/auth/google/callback",
    ],
  });
}
