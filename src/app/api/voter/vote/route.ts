import { ok, handleError, fail } from "@/lib/api-response";
import { VoteService } from "@/services/vote.service";
import { getClientIp, getUserAgent } from "@/lib/session";
import { db } from "@/lib/db";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { voterId, electionId } = body as { voterId: string; electionId: string };

    const election = await db.election.findUnique({
      where: { id: electionId },
      select: { id: true, status: true, name: true, positions: { include: { candidates: true } } },
    });
    if (!election) return fail("Election not found", "NOT_FOUND", 404);
    if (election.status !== "LIVE") {
      return fail("Election is not currently live", "ELECTION_NOT_LIVE", 400);
    }

    const voter = await db.voter.findFirst({
      where: { id: voterId, electionId },
    });
    if (!voter) return fail("Voter not found", "NOT_FOUND", 404);
    if (!voter.isEligible) return fail("Voter not eligible", "INELIGIBLE", 403);

    const alreadyVoted = await VoteService.hasVoted(voter.id, electionId);
    if (alreadyVoted) {
      return ok({ alreadyVoted: true, session: null });
    }

    const ip = await getClientIp();
    const ua = await getUserAgent();
    const session = await VoteService.startSession(voter.id, electionId, ip, ua);

    return ok({
      session,
      ballot: {
        electionName: election.name,
        positions: election.positions
          .sort((a, b) => a.order - b.order)
          .map((p) => ({
            id: p.id,
            title: p.title,
            description: p.description,
            maxChoices: p.maxChoices,
            candidates: p.candidates.map((c) => ({
              id: c.id,
              name: c.name,
              photo: c.photo,
              bio: c.bio,
              manifesto: c.manifesto,
            })),
          })),
      },
    });
  } catch (e) {
    return handleError(e);
  }
}
