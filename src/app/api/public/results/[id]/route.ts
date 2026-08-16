import { ok, handleError, fail } from "@/lib/api-response";
import { ResultService } from "@/services/result.service";
import { db } from "@/lib/db";
import { safeJsonParse } from "@/lib/utils";

type Params = { params: Promise<{ id: string }> };

export async function GET(_req: Request, { params }: Params) {
  try {
    const { id } = await params;
    const election = await db.election.findUnique({
      where: { id },
      select: { id: true, name: true, status: true, description: true, endTime: true, config: true },
    });
    if (!election) return fail("Election not found", "NOT_FOUND", 404);

    // Parse result visibility setting from election config
    const config = safeJsonParse<Record<string, unknown>>(election.config, {});
    const resultVisibility = (config.resultVisibility as string) ?? "PUBLISHED_ONLY";

    // Determine if results should be visible based on the visibility mode:
    // - LIVE: Show real-time results while voting is LIVE (no candidate breakdown shown publicly,
    //   only turnout + total votes for privacy — admin dashboard shows full breakdown)
    // - AFTER_CLOSE: Show results when status is CLOSED or later
    // - PUBLISHED_ONLY: Only show results when status is PUBLISHED
    let resultsVisible = false;
    let liveTurnoutOnly = false;

    if (resultVisibility === "LIVE" && election.status === "LIVE") {
      // Live mode during voting: show turnout stats but NOT candidate breakdown
      resultsVisible = true;
      liveTurnoutOnly = true;
    } else if (resultVisibility === "AFTER_CLOSE") {
      // After close mode: visible when CLOSED, RESULTS_REVIEW, or PUBLISHED
      if (["CLOSED", "RESULTS_REVIEW", "PUBLISHED"].includes(election.status)) {
        resultsVisible = true;
      }
    } else {
      // PUBLISHED_ONLY (default): visible only when PUBLISHED
      if (election.status === "PUBLISHED") {
        resultsVisible = true;
      }
    }

    if (!resultsVisible) {
      return ok({
        published: false,
        status: election.status,
        resultVisibility,
        electionName: election.name,
        electionId: election.id,
      });
    }

    // For live mode during voting, only return turnout stats (no candidate breakdown)
    if (liveTurnoutOnly) {
      const [totalVoters, totalVotes] = await Promise.all([
        db.voter.count({ where: { electionId: id } }),
        db.vote.count({ where: { electionId: id, status: "CAST" } }),
      ]);
      return ok({
        published: true,
        live: true,
        resultVisibility,
        election: {
          id: election.id,
          name: election.name,
          status: election.status,
          description: election.description,
          endTime: election.endTime,
        },
        liveStats: {
          totalVoters,
          totalVotes,
          turnout: totalVoters > 0 ? (totalVotes / totalVoters) * 100 : 0,
        },
        results: null, // No candidate breakdown during live voting
      });
    }

    // Full results
    const results = await ResultService.computeElectionResults(id);
    return ok({
      published: true,
      live: false,
      resultVisibility,
      election: {
        id: election.id,
        name: election.name,
        status: election.status,
        description: election.description,
        endTime: election.endTime,
      },
      results,
    });
  } catch (e) {
    return handleError(e);
  }
}
