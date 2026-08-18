import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { createSession } from "@/lib/session";
import bcrypt from "bcryptjs";
import crypto from "crypto";

const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID;
const GOOGLE_CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET;
const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? "https://votewise.com.ng";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const code = searchParams.get("code");
  const stateParam = searchParams.get("state");
  const error = searchParams.get("error");

  if (error) {
    return NextResponse.redirect(new URL(`/login?error=google_${error}`, APP_URL));
  }

  if (!code || !stateParam) {
    return NextResponse.redirect(new URL("/login?error=google_callback_error", APP_URL));
  }

  // Decode state
  let state: { role: string; next: string };
  try {
    state = JSON.parse(Buffer.from(stateParam, "base64url").toString());
  } catch {
    return NextResponse.redirect(new URL("/login?error=google_callback_error", APP_URL));
  }

  // Block for admin login
  if (state.role === "admin") {
    return NextResponse.redirect(new URL("/login?admin=1", APP_URL));
  }

  // Exchange code for tokens
  const redirectUri = `${APP_URL}/api/auth/google/callback`;
  const tokenResponse = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      code,
      client_id: GOOGLE_CLIENT_ID!,
      client_secret: GOOGLE_CLIENT_SECRET!,
      redirect_uri: redirectUri,
      grant_type: "authorization_code",
    }),
  });

  if (!tokenResponse.ok) {
    return NextResponse.redirect(new URL("/login?error=google_token_failed", APP_URL));
  }

  const tokens = await tokenResponse.json();

  // Get user profile
  const profileResponse = await fetch("https://www.googleapis.com/oauth2/v2/userinfo", {
    headers: { Authorization: `Bearer ${tokens.access_token}` },
  });

  if (!profileResponse.ok) {
    return NextResponse.redirect(new URL("/login?error=google_profile_failed", APP_URL));
  }

  const profile = await profileResponse.json();

  if (!profile.email) {
    return NextResponse.redirect(new URL("/login?error=google_no_email", APP_URL));
  }

  // Security: Google auth CANNOT access or create PLATFORM_ADMIN accounts
  const existingAdmin = await db.user.findFirst({
    where: { email: profile.email, role: "PLATFORM_ADMIN" },
  });
  if (existingAdmin) {
    return NextResponse.redirect(new URL("/login?error=google_admin_blocked", APP_URL));
  }

  // Find or create user
  let user = await db.user.findFirst({
    where: { email: profile.email },
    include: { organization: true },
  });

  if (!user) {
    // New user — create as VOTER (they'll create an org via register flow)
    // Generate a random password (Google users don't need one, but field is required)
    const randomPassword = crypto.randomBytes(32).toString("hex");
    const passwordHash = await bcrypt.hash(randomPassword, 12);

    user = await db.user.create({
      data: {
        email: profile.email,
        name: profile.name ?? profile.email.split("@")[0],
        passwordHash,
        role: "VOTER",
        emailVerified: new Date(),
        avatar: profile.picture ?? null,
      },
      include: { organization: true },
    });
  } else {
    // Update avatar if changed
    if (profile.picture && user.avatar !== profile.picture) {
      user = await db.user.update({
        where: { id: user.id },
        data: { avatar: profile.picture },
        include: { organization: true },
      });
    }
  }

  if (!user.isActive) {
    return NextResponse.redirect(new URL("/login?error=google_account_inactive", APP_URL));
  }

  // Create session
  await createSession({
    sub: user.id,
    email: user.email,
    name: user.name,
    role: user.role,
    organizationId: user.organizationId,
  });

  // If user has no org, redirect to register to create one
  const target = user.organizationId ? state.next : `/register?google=1&email=${encodeURIComponent(profile.email)}&name=${encodeURIComponent(profile.name ?? "")}`;

  return NextResponse.redirect(new URL(target, APP_URL));
}
