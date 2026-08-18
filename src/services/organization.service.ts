import { db } from "@/lib/db";
import { slugify } from "@/lib/utils";
import { ConflictError, NotFoundError } from "@/lib/errors";

export class OrganizationService {
  static async create(params: {
    name: string;
    ownerId: string;
    description?: string;
    preferredSlug?: string;
  }) {
    // Use preferred slug if provided, otherwise auto-generate from name
    let slug = params.preferredSlug
      ? params.preferredSlug.toLowerCase().trim().replace(/[^a-z0-9-]/g, "")
      : slugify(params.name);
    if (!slug) slug = `org-${Date.now().toString(36)}`;

    let uniqueSlug = slug;
    let n = 1;
    while (await db.organization.findUnique({ where: { slug: uniqueSlug } })) {
      uniqueSlug = `${slug}-${n++}`;
    }

    return db.organization.create({
      data: {
        name: params.name,
        slug: uniqueSlug,
        description: params.description ?? null,
        users: { connect: { id: params.ownerId } },
        subscriptionTier: "FREE",
      },
    });
  }

  static async getBySlug(slug: string) {
    return db.organization.findUnique({ where: { slug } });
  }

  static async getForUser(userId: string) {
    const user = await db.user.findUnique({
      where: { id: userId },
      select: { organizationId: true },
    });
    if (!user?.organizationId) return null;
    return db.organization.findUnique({
      where: { id: user.organizationId },
    });
  }

  static async update(id: string, data: { name?: string; description?: string; logo?: string | null }) {
    return db.organization.update({ where: { id }, data });
  }

  static async stats(organizationId: string) {
    const [
      elections,
      activeElections,
      voters,
      candidates,
      totalVotes,
      pendingTickets,
    ] = await Promise.all([
      db.election.count({ where: { organizationId } }),
      db.election.count({
        where: { organizationId, status: { in: ["LIVE", "SCHEDULED"] } },
      }),
      db.voter.count({ where: { organizationId } }),
      db.candidate.count({
        where: { election: { organizationId } },
      }),
      db.vote.count({
        where: { election: { organizationId }, status: "CAST" },
      }),
      db.supportTicket.count({
        where: { organizationId, status: { in: ["OPEN", "IN_PROGRESS", "WAITING"] } },
      }),
    ]);
    return {
      elections,
      activeElections,
      voters,
      candidates,
      totalVotes,
      pendingTickets,
    };
  }

  static async ensureMembership(
    userId: string,
    organizationId: string
  ): Promise<boolean> {
    const user = await db.user.findUnique({
      where: { id: userId },
      select: { organizationId: true, role: true },
    });
    if (!user) return false;
    if (user.role === "PLATFORM_ADMIN") return true;
    return user.organizationId === organizationId;
  }

  static async getElectionOrFail(
    electionId: string,
    organizationId: string
  ) {
    const election = await db.election.findUnique({
      where: { id: electionId },
    });
    if (!election) throw new NotFoundError("Election");
    if (election.organizationId !== organizationId) {
      throw new NotFoundError("Election");
    }
    return election;
  }

  /**
   * Check if an election is "locked" — i.e., candidates/positions
   * cannot be modified. An election is locked when it's LIVE or
   * any status after LIVE (CLOSED, RESULTS_REVIEW, PUBLISHED, ARCHIVED).
   *
   * SECURITY (F-08): Prevents mid-election candidate tampering.
   */
  static assertElectionNotLocked(status: string): void {
    const lockedStatuses = ["LIVE", "CLOSED", "RESULTS_REVIEW", "PUBLISHED", "ARCHIVED"];
    if (lockedStatuses.includes(status)) {
      throw new ForbiddenError(
        "Election configuration is locked. Candidates and positions cannot be modified while the election is live or has closed."
      );
    }
  }
}
