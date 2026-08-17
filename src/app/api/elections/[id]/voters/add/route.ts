import { ok, handleError, fail } from "@/lib/api-response";
import { requireOrgAdmin } from "@/lib/session";
import { db } from "@/lib/db";
import { AuditService } from "@/services/audit.service";
import { z } from "zod";

const addVoterSchema = z.object({
  firstName: z.string().min(1, "First name is required"),
  lastName: z.string().min(1, "Last name is required"),
  email: z.string().email("Valid email required").optional().or(z.literal("")),
  phone: z.string().optional().or(z.literal("")),
  matricNumber: z.string().optional().or(z.literal("")),
  department: z.string().optional().or(z.literal("")),
  faculty: z.string().optional().or(z.literal("")),
  level: z.string().optional().or(z.literal("")),
});

/**
 * Manually add/register a single voter to an election.
 */
export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireOrgAdmin();
    const { id: electionId } = await params;

    const election = await db.election.findFirst({
      where: { id: electionId, organizationId: user.organizationId },
    });
    if (!election) return fail("Election not found", "NOT_FOUND", 404);

    const body = await request.json();
    const parsed = addVoterSchema.parse(body);

    const fullName = `${parsed.firstName} ${parsed.lastName}`.trim();

    // Generate unique identifier from matric, email, or phone
    const identifier = parsed.matricNumber || parsed.email || parsed.phone || "";
    if (!identifier) {
      return fail("At least one of matric number, email, or phone is required", "BAD_REQUEST", 400);
    }

    // Check for duplicate
    const existing = await db.voter.findUnique({
      where: { uniqueIdentifier_electionId: { uniqueIdentifier: identifier, electionId } },
    });
    if (existing) {
      return fail("A voter with this identifier already exists in this election.", "DUPLICATE", 409);
    }

    const voter = await db.voter.create({
      data: {
        name: fullName,
        email: parsed.email || null,
        phone: parsed.phone || null,
        matricNumber: parsed.matricNumber || null,
        department: parsed.department || null,
        faculty: parsed.faculty || null,
        level: parsed.level || null,
        uniqueIdentifier: identifier,
        isEligible: true,
        electionId,
        organizationId: user.organizationId!,
      },
    });

    await AuditService.log({
      actorId: user.id,
      organizationId: user.organizationId,
      action: "VOTER_UPDATE",
      resource: "voter",
      resourceId: voter.id,
      result: "SUCCESS",
      metadata: { action: "manual_add", name: fullName },
    });

    return ok({ voter }, 201);
  } catch (e) {
    return handleError(e);
  }
}
