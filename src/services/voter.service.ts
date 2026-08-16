import { db } from "@/lib/db";
import { generateUniqueIdentifier } from "@/lib/utils";
import { ValidationError } from "@/lib/errors";

export interface VoterRow {
  name: string;
  matricNumber?: string;
  department?: string;
  faculty?: string;
  level?: string;
  phone?: string;
  email?: string;
}

export interface ImportResult {
  total: number;
  created: number;
  updated: number;
  skipped: number;
  errors: { row: number; message: string }[];
}

export class VoterService {
  static async listForElection(electionId: string, opts?: { search?: string }) {
    const where = {
      electionId,
      ...(opts?.search
        ? {
            OR: [
              { name: { contains: opts.search } },
              { email: { contains: opts.search } },
              { uniqueIdentifier: { contains: opts.search } },
              { matricNumber: { contains: opts.search } },
              { phone: { contains: opts.search } },
            ],
          }
        : {}),
    };
    return db.voter.findMany({
      where,
      orderBy: { createdAt: "desc" },
    });
  }

  static async previewImport(
    rows: VoterRow[]
  ): Promise<{
    valid: VoterRow[];
    duplicates: { row: number; identifier: string }[];
    invalid: { row: number; message: string }[];
  }> {
    const valid: VoterRow[] = [];
    const duplicates: { row: number; identifier: string }[] = [];
    const invalid: { row: number; message: string }[] = [];
    const seen = new Set<string>();

    rows.forEach((row, idx) => {
      if (!row.name || row.name.trim().length < 2) {
        invalid.push({ row: idx + 1, message: "Missing voter name" });
        return;
      }
      if (!row.email && !row.phone) {
        invalid.push({
          row: idx + 1,
          message: "Voter needs at least an email or phone for verification",
        });
        return;
      }
      const identifier =
        row.matricNumber?.trim() || row.email?.trim() || row.phone?.trim() || "";
      if (!identifier) {
        invalid.push({ row: idx + 1, message: "Missing unique identifier" });
        return;
      }
      if (seen.has(identifier)) {
        duplicates.push({ row: idx + 1, identifier });
        return;
      }
      seen.add(identifier);
      valid.push(row);
    });

    return { valid, duplicates, invalid };
  }

  static async import(
    electionId: string,
    organizationId: string,
    rows: VoterRow[]
  ): Promise<ImportResult> {
    const errors: { row: number; message: string }[] = [];
    let created = 0;
    let updated = 0;
    let skipped = 0;

    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      try {
        if (!row.name) {
          errors.push({ row: i + 1, message: "Missing name" });
          skipped++;
          continue;
        }
        const identifier =
          row.matricNumber?.trim() || row.email?.trim() || row.phone?.trim() || "";
        if (!identifier) {
          errors.push({
            row: i + 1,
            message: "Missing unique identifier (matric/email/phone)",
          });
          skipped++;
          continue;
        }

        const existing = await db.voter.findUnique({
          where: {
            uniqueIdentifier_electionId: {
              uniqueIdentifier: identifier,
              electionId,
            },
          },
        });

        if (existing) {
          await db.voter.update({
            where: { id: existing.id },
            data: {
              name: row.name,
              matricNumber: row.matricNumber ?? existing.matricNumber,
              department: row.department ?? existing.department,
              faculty: row.faculty ?? existing.faculty,
              level: row.level ?? existing.level,
              phone: row.phone ?? existing.phone,
              email: row.email ?? existing.email,
            },
          });
          updated++;
        } else {
          await db.voter.create({
            data: {
              name: row.name,
              matricNumber: row.matricNumber ?? null,
              department: row.department ?? null,
              faculty: row.faculty ?? null,
              level: row.level ?? null,
              phone: row.phone ?? null,
              email: row.email ?? null,
              uniqueIdentifier: identifier,
              isEligible: true,
              electionId,
              organizationId,
            },
          });
          created++;
        }
      } catch (e) {
        errors.push({
          row: i + 1,
          message: e instanceof Error ? e.message : "Unknown error",
        });
        skipped++;
      }
    }

    return { total: rows.length, created, updated, skipped, errors };
  }

  static async updateEligibility(id: string, eligible: boolean) {
    return db.voter.update({
      where: { id },
      data: { isEligible: eligible },
    });
  }

  static async delete(id: string) {
    return db.voter.delete({ where: { id } });
  }

  static async findByLookup(electionId: string, lookup: string) {
    return db.voter.findFirst({
      where: {
        electionId,
        OR: [
          { uniqueIdentifier: lookup },
          { email: lookup },
          { phone: lookup },
          { matricNumber: lookup },
        ],
      },
    });
  }
}
