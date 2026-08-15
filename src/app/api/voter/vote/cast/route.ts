import { ok, handleError, fail } from "@/lib/api-response";
import { castVoteSchema } from "@/lib/validators";
import { VoteService } from "@/services/vote.service";
import { getClientIp } from "@/lib/session";
import { rateLimit } from "@/lib/rate-limit";
import { RateLimitError } from "@/lib/errors";

export async function POST(request: Request) {
  try {
    const ip = await getClientIp();
    const rl = rateLimit(`vote:${ip ?? "anon"}`, 60_000, 5);
    if (!rl.allowed) throw new RateLimitError("Too many vote attempts. Slow down.");

    const body = await request.json();
    const parsed = castVoteSchema.parse(body);
    const { voterId } = body as { voterId: string };

    const result = await VoteService.castVotes(
      voterId,
      parsed.electionId,
      parsed.sessionId,
      parsed.votes
    );

    return ok({ receipt: result.receipt, count: result.count });
  } catch (e) {
    return handleError(e);
  }
}
