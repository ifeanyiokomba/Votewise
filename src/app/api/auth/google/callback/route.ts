import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { createSession } from "@/lib/session";
import { AuditService } from "@/services/audit.service";
import { NotificationService } from "@/services/notification.service";
import { EmailTemplates } from "@/lib/email-templates";
import { OrganizationService } from "@/services/organization.service";
import bcrypt from "bcryptjs";

/**
 * Google OAuth callback handler.
 *
 * Exchanges the authorization code for a Google access token,
 * fetches the user's Google profile, and either:
 *   1. Links to an existing user (by email)
 *   2. Creates a new organization owner account
 *
 * Google auth CANNOT create or access PLATFORM_ADMIN accounts.
 * All Google-authenticated users get the VOTER role by default,
 * or are matched to their existing role if they already have an account.
 */

const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const code = searchParams.get("code");
    const state = searchParams.get("state");
    const error = searchParams.get("error");

    if (error) {
      return NextResponse.redirect(`${APP_URL}/login?error=google_auth_cancelled`);
    }
    if (!code) {
      return NextResponse.redirect(`${APP_URL}/login?error=google_auth_failed`);
    }

    const clientId = process.env.GOOGLE_CLIENT_ID;
    const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
    if (!clientId || !clientSecret) {
      return NextResponse.redirect(`${APP_URL}/login?error=google_not_configured`);
    }

    const redirectUri = `${APP_URL}/api/auth/google/callback`;

    // Exchange code for access token
    const tokenRes = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        code,
        client_id: clientId,
        client_secret: clientSecret,
        redirect_uri: redirectUri,
        grant_type: "authorization_code",
      }),
    });

    if (!tokenRes.ok) {
      console.error("[google-auth] token exchange failed:", tokenRes.status);
      return NextResponse.redirect(`${APP_URL}/login?error=google_token_failed`);
    }

    const tokenData = await tokenRes.json();
    const accessToken = tokenData.access_token;

    // Fetch user profile from Google
    const profileRes = await fetch("https://www.googleapis.com/oauth2/v2/userinfo", {
      headers: { Authorization: `Bearer ${accessToken}` },
    });

    if (!profileRes.ok) {
      console.error("[google-auth] profile fetch failed:", profileRes.status);
      return NextResponse.redirect(`${APP_URL}/login?error=google_profile_failed`);
    }

    const googleUser = await profileRes.json();
    const email = googleUser.email;
    const name = googleUser.name || googleUser.given_name || "Google User";
    const picture = googleUser.picture;

    if (!email) {
      return NextResponse.redirect(`${APP_URL}/login?error=google_no_email`);
    }

    // Check if user already exists by email (across all orgs)
    let user = await db.user.findFirst({
      where: { email },
    });

    // SECURITY: Google auth can NEVER access or create PLATFORM_ADMIN accounts
    if (user && user.role === "PLATFORM_ADMIN") {
      // Log security event — attempt to use Google auth for admin
      await AuditService.log({
        action: "AUTH_FAILURE",
        resource: "auth",
        result: "GOOGLE_ADMIN_BLOCKED",
        metadata: { email, reason: "Google auth cannot access platform admin" },
      });
      return NextResponse.redirect(`${APP_URL}/login?error=google_admin_blocked`);
    }

    if (user) {
      // Existing user — link Google account and sign in
      // Update avatar if we have a Google picture and user doesn't have one
      if (picture && !user.avatar) {
        await db.user.update({
          where: { id: user.id },
          data: { avatar: picture, emailVerified: user.emailVerified ?? new Date() },
        });
      }

      if (!user.isActive) {
        return NextResponse.redirect(`${APP_URL}/login?error=account_disabled`);
      }

      await db.user.update({
        where: { id: user.id },
        data: { lastLoginAt: new Date() },
      });
    } else {
      // New user — create account with VOTER role (no org yet)
      const passwordHash = await bcrypt.hash(crypto.randomUUID(), 12);
      user = await db.user.create({
        data: {
          email,
          name,
          passwordHash,
          role: "VOTER",
          emailVerified: new Date(),
          avatar: picture ?? null,
          isActive: true,
        },
      });

      // Send welcome email
      const template = EmailTemplates.welcome({
        name: user.name,
        organizationName: "Votewise",
      });
      const n = await NotificationService.queue({
        type: "EMAIL",
        recipient: user.email,
        subject: template.subject,
        body: template.body,
      });
      await NotificationService.dispatch(n.id);

      await AuditService.log({
        actorId: user.id,
        action: "USER_REGISTERED",
        resource: "user",
        resourceId: user.id,
        result: "SUCCESS",
        metadata: { email: user.email, provider: "google" },
      });
    }

    // Create session
    await createSession({
      sub: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      organizationId: user.organizationId,
    });

    await AuditService.log({
      actorId: user.id,
      organizationId: user.organizationId,
      action: "LOGIN",
      resource: "auth",
      result: "SUCCESS",
      metadata: { provider: "google" },
    });

    // Redirect to dashboard (or register if no org yet — voter needs to create org)
    const redirectTo = user.organizationId ? "/dashboard" : "/register?google=1";
    return NextResponse.redirect(`${APP_URL}${redirectTo}`);
  } catch (e) {
    console.error("[google-auth] callback error:", e);
    return NextResponse.redirect(`${APP_URL}/login?error=google_callback_error`);
  }
}
