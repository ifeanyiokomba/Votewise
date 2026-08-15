import { ok, handleError, fail } from "@/lib/api-response";
import { voterVerifySchema } from "@/lib/validators";
import { OtpService } from "@/services/otp.service";
import { VoterService } from "@/services/voter.service";
import { VoteService } from "@/services/vote.service";
import { rateLimit } from "@/lib/rate-limit";
import { getClientIp } from "@/lib/session";
import { RateLimitError } from "@/lib/errors";
import { NextRequest } from "next/server";
import { db } from "@/lib/db";

export async function POST(request: NextRequest) {
  try {
    const ip = (await getClientIp()) ?? "unknown";
    const rl = rateLimit(`otp:${ip}`, 60_000, 5);
    if (!rl.allowed) throw new RateLimitError("Too many verification attempts. Wait a minute.");

    const body = await request.json();
    const parsed = voterVerifySchema.parse(body);

    const election = await db.election.findUnique({
      where: { id: parsed.electionId },
      select: { id: true, status: true, name: true },
    });
    if (!election) return fail("Election not found", "NOT_FOUND", 404);
    if (!["LIVE", "SCHEDULED", "READY", "PAUSED"].includes(election.status)) {
      return fail("Election is not open for verification", "ELECTION_CLOSED", 400);
    }

    // Resolve voter by voterId (may be the actual id or a lookup value)
    let voter = await db.voter.findFirst({
      where: { id: parsed.voterId, electionId: parsed.electionId },
    });
    if (!voter) {
      voter = await VoterService.findByLookup(parsed.electionId, parsed.voterId);
    }
    if (!voter) {
      // Anti-enumeration: return generic message.
      return fail(
        "We could not find a matching voter record. Check your details and try again.",
        "VOTER_NOT_FOUND",
        404
      );
    }
    if (!voter.isEligible) {
      return fail("You are not eligible to vote in this election.", "INELIGIBLE", 403);
    }

    const alreadyVoted = await VoteService.hasVoted(voter.id, parsed.electionId);
    if (alreadyVoted) {
      return ok({ alreadyVoted: true, voterId: voter.id });
    }

    if (parsed.code) {
      // Verify code
      const result = await OtpService.verify(
        voter.id,
        parsed.electionId,
        parsed.code
      );
      return ok({ verified: result.verified, error: result.error, voterId: voter.id });
    }

    // Send OTP
    const channel = (parsed.channel ?? (voter.email ? "EMAIL" : voter.phone ? "SMS" : "EMAIL")) as
      | "EMAIL"
      | "SMS"
      | "WHATSAPP";

    const result = await OtpService.sendOtp(voter.id, parsed.electionId, channel);
    return ok({
      sent: result.success,
      attemptsRemaining: result.attemptsRemaining,
      voterId: voter.id,
      channel,
      // Dev preview so QA can complete the flow without a real provider:
      devCode: result.devCode,
    });
  } catch (e) {
    return handleError(e);
  }
}
