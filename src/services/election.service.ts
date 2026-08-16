import { db } from "@/lib/db";
import { VALID_STATUS_TRANSITIONS } from "@/lib/constants";
import { ConflictError, NotFoundError, ValidationError } from "@/lib/errors";

export type CreateElectionInput = {
  name: string;
  description?: string | null;
  type?: string;
  startTime?: Date | null;
  endTime?: Date | null;
  timezone?: string;
};

export class ElectionService {
  static async create(organizationId: string, input: CreateElectionInput) {
    if (input.startTime && input.endTime && input.startTime >= input.endTime) {
      throw new ValidationError("End time must be after start time");
    }
    return db.election.create({
      data: {
        name: input.name,
        description: input.description ?? null,
        type: (input.type as never) ?? "GENERAL",
        startTime: input.startTime ?? null,
        endTime: input.endTime ?? null,
        timezone: input.timezone ?? "Africa/Lagos",
        organizationId,
        status: "DRAFT",
      },
    });
  }

  static async listForOrg(organizationId: string) {
    return db.election.findMany({
      where: { organizationId },
      orderBy: { createdAt: "desc" },
      include: {
        _count: {
          select: { voters: true, positions: true, candidates: true, votes: true },
        },
      },
    });
  }

  static async get(id: string) {
    return db.election.findUnique({
      where: { id },
      include: {
        _count: {
          select: {
            voters: true,
            positions: true,
            candidates: true,
            votes: true,
          },
        },
      },
    });
  }

  static async update(id: string, input: Partial<CreateElectionInput>) {
    if (input.startTime && input.endTime && input.startTime >= input.endTime) {
      throw new ValidationError("End time must be after start time");
    }
    return db.election.update({
      where: { id },
      data: {
        ...(input.name !== undefined ? { name: input.name } : {}),
        ...(input.description !== undefined ? { description: input.description } : {}),
        ...(input.type ? { type: input.type as never } : {}),
        ...(input.startTime !== undefined ? { startTime: input.startTime } : {}),
        ...(input.endTime !== undefined ? { endTime: input.endTime } : {}),
        ...(input.timezone ? { timezone: input.timezone } : {}),
      },
    });
  }

  static async transition(id: string, target: string) {
    const election = await db.election.findUnique({ where: { id } });
    if (!election) throw new NotFoundError("Election");
    const allowed = VALID_STATUS_TRANSITIONS[election.status] ?? [];
    if (!allowed.includes(target)) {
      throw new ConflictError(
        `Cannot transition election from ${election.status} to ${target}`
      );
    }
    return db.election.update({
      where: { id },
      data: { status: target as never },
    });
  }

  static async publishResults(id: string) {
    const election = await db.election.findUnique({ where: { id } });
    if (!election) throw new NotFoundError("Election");
    if (!["CLOSED", "RESULTS_REVIEW", "PUBLISHED"].includes(election.status)) {
      throw new ConflictError("Election must be closed before publishing results");
    }
    return db.election.update({
      where: { id },
      data: { status: "PUBLISHED" },
    });
  }

  static async stats(id: string) {
    const election = await db.election.findUnique({
      where: { id },
      select: { id: true, status: true, startTime: true, endTime: true },
    });
    if (!election) throw new NotFoundError("Election");

    const [voters, verified, completedVotes, activeSessions, candidates, positions] =
      await Promise.all([
        db.voter.count({ where: { electionId: id } }),
        db.verificationAttempt.count({
          where: { electionId: id, status: "VERIFIED" },
        }),
        db.vote.count({ where: { electionId: id, status: "CAST" } }),
        db.votingSession.count({
          where: { electionId: id, isActive: true },
        }),
        db.candidate.count({ where: { electionId: id } }),
        db.position.count({ where: { electionId: id } }),
      ]);

    return {
      ...election,
      voters,
      verified,
      completedVotes,
      activeSessions,
      candidates,
      positions,
      turnout: voters > 0 ? (completedVotes / voters) * 100 : 0,
      verificationRate: voters > 0 ? (verified / voters) * 100 : 0,
    };
  }

  static async timeline(id: string) {
    const timeline = await db.vote.groupBy({
      by: ["castAt"],
      where: { electionId: id, status: "CAST" },
      _count: { _all: true },
    });
    // bucket per hour
    const buckets = new Map<string, number>();
    for (const t of timeline) {
      const key = new Date(t.castAt).toISOString().slice(0, 13);
      buckets.set(key, (buckets.get(key) ?? 0) + t._count._all);
    }
    return [...buckets.entries()]
      .sort((a, b) => a[0].localeCompare(b[0]))
      .map(([hour, count]) => ({ hour, count }));
  }
}
