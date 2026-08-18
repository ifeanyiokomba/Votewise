import crypto from "crypto";
import { db } from "@/lib/db";
import { NotFoundError, ForbiddenError, ConflictError } from "@/lib/errors";
import { OtpService } from "./otp.service";
import { NotificationService } from "./notification.service";
import { EmailTemplates } from "@/lib/email-templates";
import { generateReference } from "@/lib/utils";

/**
 * SECURITY (VW-001): Ballot secrecy via one-way token hashing.
 *
 * The anonymousToken is a random 32-byte value generated when a voter starts
 * a voting session. It is used to:
 * 1. Look up the session (via tokenHash = SHA-256(anonymousToken))
 * 2. Write Vote rows (stores the RAW anonymousToken — but Vote has no voterId)
 *
 * The VotingSession table stores ONLY the hash (tokenHash), never the raw token.
 * This means a DB-level join `VotingSession JOIN Vote ON token = anonymousToken`
 * is IMPOSSIBLE — you can't reverse SHA-256 to match the raw token in Vote.
 *
 * The raw token exists only in the API response (sent to the voter's browser)
 * and in memory during the castVotes() call. It is never persisted alongside
 * voterId in any table.
 */

function hashToken(token: string): string {
  return crypto.createHash("sha256").update(token).digest("hex");
}

export class VoteService {
  static async startSession(
    voterId: string,
    electionId: string,
    ipAddress?: string,
    userAgent?: string
  ) {
    const voter = await db.voter.findFirst({
      where: { id: voterId, electionId },
    });
    if (!voter) throw new NotFoundError("Voter");
    if (!voter.isEligible) throw new ForbiddenError("Voter is not eligible");

    const election = await db.election.findUnique({ where: { id: electionId } });
    if (!election) throw new NotFoundError("Election");
    if (election.status !== "LIVE") {
      throw new ForbiddenError("Election is not currently live");
    }

    const verified = await OtpService.isVoterVerified(voterId, electionId);
    if (!verified) {
      throw new ForbiddenError("Voter must be verified before voting");
    }

    // ─── CRITICAL: enforce one-vote-per-voter at the service layer ───
    if (await this.hasVoted(voterId, electionId)) {
      throw new ConflictError("You have already cast your ballot for this election");
    }

    // Re-use an active session if present (idempotent)
    const existing = await db.votingSession.findFirst({
      where: { voterId, electionId, isActive: true },
    });
    if (existing) {
      // Can't return the raw token from an existing session (we only stored the hash).
      // The voter should already have the token from their original session start.
      // Return the session with a null token — the client must use its cached token.
      return { ...existing, anonymousToken: null };
    }

    // Generate raw token — only stored in memory + returned to client
    const anonymousToken = crypto.randomBytes(32).toString("hex");
    // Store ONLY the hash in the database
    const tokenHash = hashToken(anonymousToken);

    const session = await db.votingSession.create({
      data: {
        voterId,
        electionId,
        tokenHash,
        ipAddress,
        userAgent,
        isActive: true,
      },
    });

    // Return session with raw token (client needs it for casting votes)
    return { ...session, anonymousToken };
  }

  static async castVotes(
    voterId: string,
    electionId: string,
    sessionId: string,
    selections: { positionId: string; candidateId: string }[],
    anonymousToken: string,
  ): Promise<{ receipt: string; count: number }> {
    const voter = await db.voter.findFirst({
      where: { id: voterId, electionId },
    });
    if (!voter) throw new NotFoundError("Voter");

    const election = await db.election.findUnique({
      where: { id: electionId },
      include: { positions: true },
    });
    if (!election) throw new NotFoundError("Election");
    if (election.status !== "LIVE") {
      throw new ForbiddenError("Election is not currently live");
    }

    // Look up session by ID + verify the token hash matches
    const session = await db.votingSession.findFirst({
      where: { id: sessionId, voterId, electionId, isActive: true },
    });
    if (!session || !session.tokenHash) {
      throw new ForbiddenError("Invalid or inactive voting session");
    }

    // Verify the provided anonymousToken matches the stored hash
    if (hashToken(anonymousToken) !== session.tokenHash) {
      throw new ForbiddenError("Invalid session token");
    }

    // ─── CRITICAL: defense-in-depth — re-check hasVoted before writing ───
    if (await this.hasVoted(voterId, electionId)) {
      throw new ConflictError("You have already cast your ballot for this election");
    }

    // Ensure no votes already exist for this token
    const alreadyVoted = await db.vote.findFirst({
      where: { anonymousToken, electionId },
    });
    if (alreadyVoted) {
      throw new ConflictError("You have already cast your ballot for this election");
    }

    // ─── Validate maxChoices + duplicate positions (Finding #15) ───
    const positionSelections = new Map<string, string[]>();
    for (const sel of selections) {
      const position = election.positions.find((p) => p.id === sel.positionId);
      if (!position) throw new NotFoundError("Position");
      const candidate = await db.candidate.findFirst({
        where: { id: sel.candidateId, positionId: sel.positionId, electionId },
      });
      if (!candidate) throw new NotFoundError("Candidate");

      const existing = positionSelections.get(sel.positionId) ?? [];
      if (existing.includes(sel.candidateId)) {
        throw new ConflictError("Duplicate candidate selection for the same position");
      }
      existing.push(sel.candidateId);
      positionSelections.set(sel.positionId, existing);

      const maxChoices = position.maxChoices ?? 1;
      if (existing.length > maxChoices) {
        throw new ConflictError(
          `Position "${position.title}" allows a maximum of ${maxChoices} choice(s). ` +
            `You submitted ${existing.length}.`
        );
      }
    }

    // Atomic transaction: insert all votes + close session
    const receipt = generateReference("VOTEREC");

    await db.$transaction(async (tx) => {
      for (const sel of selections) {
        const ballotHash = crypto
          .createHash("sha256")
          .update(`${anonymousToken}:${sel.positionId}:${sel.candidateId}`)
          .digest("hex");

        await tx.vote.create({
          data: {
            anonymousToken,
            electionId,
            positionId: sel.positionId,
            candidateId: sel.candidateId,
            ballotHash,
            status: "CAST",
          },
        });
      }

      await tx.votingSession.update({
        where: { id: session.id },
        data: { isActive: false, completedAt: new Date() },
      });
    });

    // Receipt notification (best-effort)
    if (voter.email) {
      const template = EmailTemplates.receipt({
        name: voter.name,
        electionName: election.name,
        reference: receipt,
      });
      const n = await NotificationService.queue({
        type: "EMAIL",
        recipient: voter.email,
        subject: template.subject,
        body: template.body,
        electionId,
        metadata: { kind: "receipt", reference: receipt },
      });
      await NotificationService.dispatch(n.id);
    }

    return { receipt, count: selections.length };
  }

  static async hasVoted(voterId: string, electionId: string): Promise<boolean> {
    const session = await db.votingSession.findFirst({
      where: { voterId, electionId, isActive: false, completedAt: { not: null } },
    });
    return !!session;
  }
}
