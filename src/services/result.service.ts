import { db } from "@/lib/db";
import { NotFoundError } from "@/lib/errors";

export interface PositionResult {
  position: {
    id: string;
    title: string;
    description: string | null;
  };
  totalVotes: number;
  candidates: {
    id: string;
    name: string;
    photo: string | null;
    voteCount: number;
    percentage: number;
    rank: number;
  }[];
  winnerId: string | null;
  isTie: boolean;
}

export interface ElectionResults {
  electionId: string;
  electionName: string;
  totalVotes: number;
  totalVoters: number;
  turnout: number;
  positions: PositionResult[];
}

export class ResultService {
  static async computeElectionResults(electionId: string): Promise<ElectionResults> {
    const election = await db.election.findUnique({
      where: { id: electionId },
      include: {
        positions: {
          orderBy: { order: "asc" },
          include: {
            candidates: { orderBy: { name: "asc" } },
          },
        },
        voters: { select: { id: true } },
      },
    });
    if (!election) throw new NotFoundError("Election");

    const totalVoters = election.voters.length;
    const positions: PositionResult[] = [];

    let totalVotes = 0;

    for (const position of election.positions) {
      const counts = await db.vote.groupBy({
        by: ["candidateId"],
        where: { electionId, positionId: position.id, status: "CAST" },
        _count: { _all: true },
      });

      const countMap = new Map<string, number>();
      for (const c of counts) countMap.set(c.candidateId, c._count._all);

      const positionTotal = [...countMap.values()].reduce((a, b) => a + b, 0);
      totalVotes += positionTotal;

      const candidatesRanked = position.candidates.map((cand) => {
        const voteCount = countMap.get(cand.id) ?? 0;
        const percentage =
          positionTotal > 0 ? (voteCount / positionTotal) * 100 : 0;
        return {
          id: cand.id,
          name: cand.name,
          photo: cand.photo,
          voteCount,
          percentage,
          rank: 0,
        };
      });

      candidatesRanked.sort((a, b) => b.voteCount - a.voteCount);
      candidatesRanked.forEach((c, i) => {
        c.rank = i + 1;
      });

      const top = candidatesRanked[0];
      const second = candidatesRanked[1];
      const isTie =
        top && second ? top.voteCount === second.voteCount : false;
      const winnerId = top && !isTie && top.voteCount > 0 ? top.id : null;

      positions.push({
        position: {
          id: position.id,
          title: position.title,
          description: position.description,
        },
        totalVotes: positionTotal,
        candidates: candidatesRanked,
        winnerId,
        isTie,
      });
    }

    const turnout = totalVoters > 0 ? (totalVotes / totalVoters) * 100 : 0;

    return {
      electionId,
      electionName: election.name,
      totalVotes,
      totalVoters,
      turnout,
      positions,
    };
  }

  static async persistResults(electionId: string): Promise<void> {
    const results = await this.computeElectionResults(electionId);
    await db.$transaction(async (tx) => {
      await tx.electionResult.deleteMany({ where: { electionId } });
      for (const pos of results.positions) {
        for (const cand of pos.candidates) {
          await tx.electionResult.create({
            data: {
              electionId,
              positionId: pos.position.id,
              candidateId: cand.id,
              voteCount: cand.voteCount,
              percentage: cand.percentage,
              rank: cand.rank,
            },
          });
        }
      }
    });
  }
}
