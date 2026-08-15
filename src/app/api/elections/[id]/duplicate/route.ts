import { ok, handleError } from "@/lib/api-response";
import { OrganizationService } from "@/services/organization.service";
import { requireOrgAdmin } from "@/lib/session";
import { db } from "@/lib/db";
import { AuditService } from "@/services/audit.service";

type Params = { params: Promise<{ id: string }> };

/**
 * Duplicate an election's setup (positions + candidates, NOT voters/votes/sessions).
 * Creates a new election in DRAFT status with "(Copy)" suffix.
 */
export async function POST(_req: Request, { params }: Params) {
  try {
    const user = await requireOrgAdmin();
    const { id } = await params;
    const source = await OrganizationService.getElectionOrFail(
      id,
      user.organizationId!
    );

    // Fetch positions + candidates from source
    const positions = await db.position.findMany({
      where: { electionId: id },
      orderBy: { order: "asc" },
      include: { candidates: { orderBy: { name: "asc" } } },
    });

    // Create the duplicate election in a transaction
    const newElection = await db.$transaction(async (tx) => {
      const dup = await tx.election.create({
        data: {
          name: `${source.name} (Copy)`,
          description: source.description,
          type: source.type,
          timezone: source.timezone,
          organizationId: source.organizationId,
          status: "DRAFT",
        },
      });

      for (const pos of positions) {
        const newPos = await tx.position.create({
          data: {
            title: pos.title,
            description: pos.description,
            maxChoices: pos.maxChoices,
            order: pos.order,
            electionId: dup.id,
          },
        });
        for (const cand of pos.candidates) {
          await tx.candidate.create({
            data: {
              name: cand.name,
              photo: cand.photo,
              bio: cand.bio,
              manifesto: cand.manifesto,
              positionId: newPos.id,
              electionId: dup.id,
            },
          });
        }
      }

      // Move to CONFIGURATION (positions already exist)
      await tx.election.update({
        where: { id: dup.id },
        data: { status: "CONFIGURATION" },
      });

      return dup;
    });

    await AuditService.log({
      actorId: user.id,
      organizationId: user.organizationId,
      action: "ELECTION_CREATE",
      resource: "election",
      resourceId: newElection.id,
      result: "SUCCESS",
      metadata: { duplicatedFrom: id, name: newElection.name },
    });

    return ok({ election: newElection }, 201);
  } catch (e) {
    return handleError(e);
  }
}
