import { ok, handleError, fail } from "@/lib/api-response";
import { ResultService } from "@/services/result.service";
import { db } from "@/lib/db";

type Params = { params: Promise<{ id: string }> };

export async function GET(_req: Request, { params }: Params) {
  try {
    const { id } = await params;
    const election = await db.election.findUnique({
      where: { id },
      select: { id: true, name: true, status: true, description: true, endTime: true },
    });
    if (!election) return fail("Election not found", "NOT_FOUND", 404);

    // Public results only available when election is PUBLISHED
    if (election.status !== "PUBLISHED") {
      return ok({
        published: false,
        status: election.status,
        electionName: election.name,
        electionId: election.id,
      });
    }

    const results = await ResultService.computeElectionResults(id);
    return ok({ published: true, election, results });
  } catch (e) {
    return handleError(e);
  }
}
