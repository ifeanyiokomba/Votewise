import crypto from "crypto";
import { db } from "@/lib/db";
import { NotFoundError, ForbiddenError, ConflictError } from "@/lib/errors";
import { OtpService } from "./otp.service";
import { NotificationService } from "./notification.service";
import { EmailTemplates } from "@/lib/email-templates";
import { generateReference } from "@/lib/utils";

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

    // Re-use an active session if present (idempotent)
    const existing = await db.votingSession.findFirst({
      where: { voterId, electionId, isActive: true },
    });
    if (existing) return existing;

    const anonymousToken = crypto.randomBytes(32).toString("hex");

    return db.votingSession.create({
      data: {
        voterId,
        electionId,
        anonymousToken,
        ipAddress,
        userAgent,
        isActive: true,
      },
    });
  }

  static async castVotes(
    voterId: string,
    electionId: string,
    sessionId: string,
    selections: { positionId: string; candidateId: string }[]
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

    const session = await db.votingSession.findFirst({
      where: { id: sessionId, voterId, electionId, isActive: true },
    });
    if (!session || !session.anonymousToken) {
      throw new ForbiddenError("Invalid or inactive voting session");
    }

    // Ensure the voter has not already cast votes for this election via this session
    const alreadyVoted = await db.vote.findFirst({
      where: { anonymousToken: session.anonymousToken, electionId },
    });
    if (alreadyVoted) {
      throw new ConflictError("You have already cast your ballot for this election");
    }

    // Validate every selection maps to a real position+candidate in this election
    for (const sel of selections) {
      const position = election.positions.find((p) => p.id === sel.positionId);
      if (!position) throw new NotFoundError("Position");
      const candidate = await db.candidate.findFirst({
        where: { id: sel.candidateId, positionId: sel.positionId, electionId },
      });
      if (!candidate) throw new NotFoundError("Candidate");
    }

    // Atomic transaction: insert all votes + close session
    const receipt = generateReference("VOTEREC");

    await db.$transaction(async (tx) => {
      for (const sel of selections) {
        const ballotHash = crypto
          .createHash("sha256")
          .update(`${session.anonymousToken}:${sel.positionId}:${sel.candidateId}`)
          .digest("hex");

        await tx.vote.create({
          data: {
            anonymousToken: session.anonymousToken,
            electionId,
            positionId: sel.positionId,
            candidateId: sel.candidateId,
            sessionId: session.id,
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
