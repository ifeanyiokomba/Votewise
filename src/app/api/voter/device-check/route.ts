import { ok, handleError } from "@/lib/api-response";
import { db } from "@/lib/db";
import crypto from "crypto";

/**
 * Device fingerprint detection for anti-fraud.
 *
 * When a voter starts a session, we check if their device fingerprint
 * has been seen before in this election. If so, we flag it and prompt
 * the voter to take a live selfie photo for verification.
 *
 * This catches:
 * - One person voting multiple times from the same device
 * - Shared devices being used to cast multiple ballots
 *
 * The fingerprint is derived from:
 * - User-Agent + screen resolution + timezone + language + platform
 * - Hashed with SHA-256 (cannot reverse to identify the user)
 */

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { electionId, voterId, fingerprint } = body as {
      electionId: string;
      voterId: string;
      fingerprint: {
        userAgent: string;
        screen: string;
        timezone: string;
        language: string;
        platform: string;
      };
    };

    if (!electionId || !voterId || !fingerprint) {
      return ok({ requirePhoto: false });
    }

    // Hash the fingerprint for storage (privacy-preserving)
    const rawFingerprint = [
      fingerprint.userAgent,
      fingerprint.screen,
      fingerprint.timezone,
      fingerprint.language,
      fingerprint.platform,
    ].join("|");

    const deviceHash = crypto
      .createHash("sha256")
      .update(rawFingerprint)
      .digest("hex")
      .slice(0, 32);

    // Check if this device has been used by ANOTHER voter in this election
    const existingSessions = await db.votingSession.findMany({
      where: {
        electionId,
        isActive: true,
        voterId: { not: voterId },
      },
      select: { userAgent: true, ipAddress: true },
    });

    // Also check completed sessions
    const completedSessions = await db.votingSession.findMany({
      where: {
        electionId,
        isActive: false,
        voterId: { not: voterId },
      },
      select: { userAgent: true, ipAddress: true },
      take: 500,
    });

    // Check if any existing session matches this device hash
    // We store the hash in the userAgent field as a secondary identifier
    // (the real userAgent is also stored)
    const allSessions = [...existingSessions, ...completedSessions];
    const deviceSeenBefore = allSessions.some((s) => {
      // Check if the userAgent contains the same fingerprint hash
      return s.userAgent?.includes(deviceHash);
    });

    // Also check by IP address (same IP + same election = suspicious)
    const requestIp = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "";
    const sameIpSessions = allSessions.filter((s) => s.ipAddress === requestIp);

    const requirePhoto = deviceSeenBefore || sameIpSessions.length > 0;

    return ok({
      requirePhoto,
      reason: requirePhoto
        ? "For security verification, please take a quick photo to confirm your identity."
        : null,
      deviceHash,
    });
  } catch (e) {
    // On any error, don't block the voter — just don't require photo
    return ok({ requirePhoto: false });
  }
}
