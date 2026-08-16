import { ok, handleError } from "@/lib/api-response";

/**
 * Initiates Google OAuth flow.
 * Returns the Google OAuth URL that the client redirects to.
 * Google OAuth is only available for organization users, NOT platform admins.
 */
export async function GET() {
  try {
    const clientId = process.env.GOOGLE_CLIENT_ID;
    if (!clientId) {
      return ok({
        enabled: false,
        authUrl: null,
        message: "Google OAuth is not configured. Set GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET.",
      });
    }

    const redirectUri = `${process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000"}/api/auth/google/callback`;
    const scopes = ["openid", "email", "profile"];
    const state = crypto.randomUUID();

    const params = new URLSearchParams({
      client_id: clientId,
      redirect_uri: redirectUri,
      response_type: "code",
      scope: scopes.join(" "),
      state,
      prompt: "select_account",
    });

    const authUrl = `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`;

    return ok({ enabled: true, authUrl, state });
  } catch (e) {
    return handleError(e);
  }
}
