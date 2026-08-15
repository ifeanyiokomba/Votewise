import { SignJWT, jwtVerify } from "jose";
import { cookies, headers } from "next/headers";
import { db } from "./db";
import { UnauthorizedError, ForbiddenError } from "./errors";

const COOKIE_NAME = "votewise_session";
const ALG = "HS256";

function getSecret(): Uint8Array {
  const secret =
    process.env.SESSION_SECRET ??
    "votewise_dev_secret_change_in_production_min_32_chars_long";
  return new TextEncoder().encode(secret);
}

export interface SessionPayload {
  sub: string; // user id
  email: string;
  name: string;
  role: string;
  organizationId: string | null;
}

export const SESSION_MAX_AGE = 60 * 60 * 24 * 7; // 7 days

export async function createSession(payload: SessionPayload): Promise<void> {
  const token = await new SignJWT({ ...payload })
    .setProtectedHeader({ alg: ALG })
    .setSubject(payload.sub)
    .setIssuedAt()
    .setExpirationTime(`${SESSION_MAX_AGE}s`)
    .sign(getSecret());

  const cookieStore = await cookies();
  cookieStore.set(COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: SESSION_MAX_AGE,
  });
}

export async function clearSession(): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.delete(COOKIE_NAME);
}

export async function getSessionToken(): Promise<string | undefined> {
  const cookieStore = await cookies();
  return cookieStore.get(COOKIE_NAME)?.value;
}

export async function getSessionPayload(): Promise<SessionPayload | null> {
  const token = await getSessionToken();
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, getSecret());
    return payload as unknown as SessionPayload;
  } catch {
    return null;
  }
}

export type SafeUser = Awaited<ReturnType<typeof getCurrentUser>>;

export async function getCurrentUser() {
  const payload = await getSessionPayload();
  if (!payload) return null;
  const user = await db.user.findUnique({
    where: { id: payload.sub },
    select: {
      id: true,
      email: true,
      name: true,
      role: true,
      organizationId: true,
      isActive: true,
      lastLoginAt: true,
      emailVerified: true,
    },
  });
  if (!user || !user.isActive) return null;
  return user;
}

export async function requireAuth() {
  const user = await getCurrentUser();
  if (!user) throw new UnauthorizedError();
  return user;
}

export async function requireRole(...roles: string[]) {
  const user = await requireAuth();
  if (!roles.includes(user.role)) throw new ForbiddenError();
  return user;
}

const ADMIN_ROLES = ["PLATFORM_ADMIN", "ORG_OWNER", "ORG_ADMIN"];

export async function requireOrgMember() {
  const user = await requireAuth();
  if (!user.organizationId) {
    throw new ForbiddenError("You are not a member of any organization");
  }
  return user;
}

export async function requireOrgAdmin() {
  const user = await requireOrgMember();
  if (!ADMIN_ROLES.includes(user.role)) {
    throw new ForbiddenError("Administrator access required");
  }
  return user;
}

export async function getCorrelationId(): Promise<string | undefined> {
  try {
    const headersList = await headers();
    return (
      headersList.get("x-correlation-id") ??
      headersList.get("x-request-id") ??
      undefined
    );
  } catch {
    return undefined;
  }
}

export async function getClientIp(): Promise<string | undefined> {
  try {
    const headersList = await headers();
    return (
      headersList.get("x-forwarded-for")?.split(",")[0]?.trim() ??
      headersList.get("x-real-ip") ??
      undefined
    );
  } catch {
    return undefined;
  }
}

export async function getUserAgent(): Promise<string | undefined> {
  try {
    const headersList = await headers();
    return headersList.get("user-agent") ?? undefined;
  } catch {
    return undefined;
  }
}
