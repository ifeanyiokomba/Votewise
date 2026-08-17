import { ok, handleError, fail } from "@/lib/api-response";
import { requireOrgMember } from "@/lib/session";
import { db } from "@/lib/db";
import { OtpService } from "@/services/otp.service";
import { z } from "zod";

const resendSchema = z.object({
  voterId: z.string(),
  electionId: z.string(),
  channel: z.enum(["EMAIL", "SMS", "WHATSAPP"]).default("EMAIL"),
});

/**
 * Admin can resend OTP to a specific voter via a specific channel.
 * Default channel is EMAIL.
 */
export async function POST(request: Request) {
  try {
    const admin = await requireOrgMember();
    const body = await request.json();
    const parsed = resendSchema.parse(body);

    // Verify the voter belongs to the admin's org
    const voter = await db.voter.findFirst({
      where: { id: parsed.voterId, electionId: parsed.electionId, organizationId: admin.organizationId },
    });
    if (!voter) return fail("Voter not found", "NOT_FOUND", 404);
    if (!voter.isEligible) return fail("Voter is not eligible", "INELIGIBLE", 403);

    const recipient = parsed.channel === "EMAIL" ? voter.email : voter.phone;
    if (!recipient) {
      return fail(`Voter has no ${parsed.channel.toLowerCase()} contact on file`, "NO_CONTACT", 400);
    }

    const result = await OtpService.sendOtp(voter.id, parsed.electionId, parsed.channel);

    if (!result.success) {
      return fail("Could not send OTP. Rate limit may apply.", "OTP_FAILED", 429);
    }

    return ok({
      sent: true,
      channel: parsed.channel,
      devCode: result.devCode,
    });
  } catch (e) {
    return handleError(e);
  }
}
