import { ok, handleError } from "@/lib/api-response";
import { VoteService } from "@/services/vote.service";
import { db } from "@/lib/db";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { voterId, electionId } = body as { voterId: string; electionId: string };

    const voter = await db.voter.findFirst({
      where: { id: voterId, electionId },
      select: { id: true, name: true },
    });
    if (!voter) return ok({ hasVoted: false });

    const hasVoted = await VoteService.hasVoted(voter.id, electionId);
    return ok({ hasVoted, voterId: voter.id });
  } catch (e) {
    return handleError(e);
  }
}
