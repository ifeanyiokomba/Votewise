import { db } from "@/lib/db";
import { NotFoundError, ValidationError } from "@/lib/errors";

export type CreatePositionInput = {
  title: string;
  description?: string | null;
  maxChoices?: number;
  order?: number;
};

export class PositionService {
  static async listForElection(electionId: string) {
    return db.position.findMany({
      where: { electionId },
      orderBy: { order: "asc" },
      include: {
        _count: { select: { candidates: true, votes: true } },
      },
    });
  }

  static async create(electionId: string, input: CreatePositionInput) {
    return db.position.create({
      data: {
        title: input.title,
        description: input.description ?? null,
        maxChoices: input.maxChoices ?? 1,
        order: input.order ?? 0,
        electionId,
      },
    });
  }

  static async update(id: string, input: Partial<CreatePositionInput>) {
    return db.position.update({
      where: { id },
      data: {
        ...(input.title !== undefined ? { title: input.title } : {}),
        ...(input.description !== undefined
          ? { description: input.description }
          : {}),
        ...(input.maxChoices !== undefined ? { maxChoices: input.maxChoices } : {}),
        ...(input.order !== undefined ? { order: input.order } : {}),
      },
    });
  }

  static async delete(id: string) {
    return db.position.delete({ where: { id } });
  }

  static async reorder(electionId: string, orderedIds: string[]) {
    await db.$transaction(
      orderedIds.map((id, idx) =>
        db.position.update({ where: { id }, data: { order: idx } })
      )
    );
  }
}
