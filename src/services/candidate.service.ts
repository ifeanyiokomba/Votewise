import { db } from "@/lib/db";

export type CreateCandidateInput = {
  name: string;
  photo?: string | null;
  bio?: string | null;
  manifesto?: string | null;
  positionId: string;
};

export class CandidateService {
  static async listForElection(electionId: string) {
    return db.candidate.findMany({
      where: { electionId },
      orderBy: { name: "asc" },
      include: {
        position: { select: { id: true, title: true } },
        _count: { select: { votes: true } },
      },
    });
  }

  static async listForPosition(electionId: string, positionId: string) {
    return db.candidate.findMany({
      where: { electionId, positionId },
      orderBy: { name: "asc" },
    });
  }

  static async create(electionId: string, input: CreateCandidateInput) {
    return db.candidate.create({
      data: {
        name: input.name,
        photo: input.photo || null,
        bio: input.bio || null,
        manifesto: input.manifesto || null,
        positionId: input.positionId,
        electionId,
      },
    });
  }

  static async update(id: string, input: Partial<CreateCandidateInput>) {
    return db.candidate.update({
      where: { id },
      data: {
        ...(input.name !== undefined ? { name: input.name } : {}),
        ...(input.photo !== undefined ? { photo: input.photo || null } : {}),
        ...(input.bio !== undefined ? { bio: input.bio || null } : {}),
        ...(input.manifesto !== undefined ? { manifesto: input.manifesto || null } : {}),
        ...(input.positionId ? { positionId: input.positionId } : {}),
      },
    });
  }

  static async delete(id: string) {
    return db.candidate.delete({ where: { id } });
  }
}
