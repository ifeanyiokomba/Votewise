import crypto from "crypto";
import bcrypt from "bcryptjs";
import { db } from "@/lib/db";
import { OTP_EXPIRY_MINUTES, MAX_OTP_ATTEMPTS, OTP_LENGTH } from "@/lib/constants";
import { NotificationService } from "./notification.service";
import { ConflictError, ForbiddenError, NotFoundError } from "@/lib/errors";
import type { VerificationChannel } from "@prisma/client";

export class OtpService {
  static generateCode(): string {
    const max = 10 ** OTP_LENGTH;
    return Math.floor(crypto.randomBytes(4).readUInt32BE() / 0x100000000 * max)
      .toString()
      .padStart(OTP_LENGTH, "0");
  }

  static async generate(): Promise<{ code: string; hash: string }> {
    const code = this.generateCode();
    const hash = await bcrypt.hash(code, 10);
    return { code, hash };
  }

  static async sendOtp(
    voterId: string,
    electionId: string,
    channel: VerificationChannel
  ): Promise<{ success: boolean; attemptsRemaining: number; devCode?: string }> {
    const voter = await db.voter.findFirst({
      where: { id: voterId, electionId },
      include: { election: true },
    });
    if (!voter) throw new NotFoundError("Voter");

    if (!voter.isEligible) throw new ForbiddenError("Voter is not eligible");

    const recipient = channel === "EMAIL" ? voter.email : voter.phone;
    if (!recipient) {
      throw new ConflictError(
        `Voter does not have a contact for channel ${channel.toLowerCase()}`
      );
    }

    const recentAttempts = await db.verificationAttempt.count({
      where: {
        voterId,
        electionId,
        createdAt: { gte: new Date(Date.now() - 60 * 1000) },
      },
    });

    if (recentAttempts >= 3) {
      return { success: false, attemptsRemaining: 0 };
    }

    const { code, hash } = await this.generate();

    await db.verificationAttempt.create({
      data: {
        channel,
        otpHash: hash,
        expiresAt: new Date(Date.now() + OTP_EXPIRY_MINUTES * 60 * 1000),
        attempts: 0,
        maxAttempts: MAX_OTP_ATTEMPTS,
        status: "PENDING",
        voterId,
        electionId,
      },
    });

    await NotificationService.sendVoterOtp({
      voterName: voter.name,
      recipient,
      channel: channel as "EMAIL" | "SMS" | "WHATSAPP",
      code,
      electionName: voter.election.name,
      electionId: voter.electionId,
    });

    return {
      success: true,
      attemptsRemaining: MAX_OTP_ATTEMPTS,
      // SECURITY (VW-002): OTP dev echo is gated on BOTH conditions:
      // 1. NODE_ENV must NOT be "production"
      // 2. ENABLE_OTP_DEV_ECHO must be explicitly "true"
      // This prevents OTP leaks even if the env var is accidentally set in production.
      devCode:
        process.env.NODE_ENV !== "production" && process.env.ENABLE_OTP_DEV_ECHO === "true"
          ? code
          : undefined,
    };
  }

  static async verify(
    voterId: string,
    electionId: string,
    code: string
  ): Promise<{ verified: boolean; error?: string }> {
    const attempt = await db.verificationAttempt.findFirst({
      where: { voterId, electionId, status: "PENDING" },
      orderBy: { createdAt: "desc" },
    });

    if (!attempt) {
      return { verified: false, error: "No pending verification found" };
    }

    if (new Date() > attempt.expiresAt) {
      await db.verificationAttempt.update({
        where: { id: attempt.id },
        data: { status: "EXPIRED" },
      });
      return { verified: false, error: "Verification code has expired" };
    }

    if (attempt.attempts >= attempt.maxAttempts) {
      await db.verificationAttempt.update({
        where: { id: attempt.id },
        data: { status: "FAILED" },
      });
      return { verified: false, error: "Maximum attempts exceeded" };
    }

    const isValid = await bcrypt.compare(code, attempt.otpHash);

    if (!isValid) {
      const remaining = attempt.maxAttempts - attempt.attempts - 1;
      await db.verificationAttempt.update({
        where: { id: attempt.id },
        data: { attempts: attempt.attempts + 1 },
      });
      return {
        verified: false,
        error:
          remaining > 0
            ? `Invalid code. ${remaining} attempt${remaining === 1 ? "" : "s"} remaining`
            : "Invalid code. No attempts remaining",
      };
    }

    await db.verificationAttempt.update({
      where: { id: attempt.id },
      data: { status: "VERIFIED" },
    });

    return { verified: true };
  }

  static async isVoterVerified(
    voterId: string,
    electionId: string
  ): Promise<boolean> {
    const verified = await db.verificationAttempt.findFirst({
      where: { voterId, electionId, status: "VERIFIED" },
    });
    return !!verified;
  }
}
