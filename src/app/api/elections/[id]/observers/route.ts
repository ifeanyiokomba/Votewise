import { ok, handleError, fail } from "@/lib/api-response";
import { OrganizationService } from "@/services/organization.service";
import { requireOrgAdmin } from "@/lib/session";
import { db } from "@/lib/db";
import { z } from "zod";

type Params = { params: Promise<{ id: string }> };

export async function GET(_req: Request, { params }: Params) {
  try {
    const user = await requireOrgAdmin();
    const { id } = await params;
    await OrganizationService.getElectionOrFail(id, user.organizationId!);

    const observers = await db.observer.findMany({
      where: { electionId: id },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            role: true,
            isActive: true,
            lastLoginAt: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    return ok({ observers });
  } catch (e) {
    return handleError(e);
  }
}

const observerSchema = z.object({
  email: z.string().email("Enter a valid email"),
  name: z.string().min(2, "Name is required").max(120),
});

export async function POST(request: Request, { params }: Params) {
  try {
    const user = await requireOrgAdmin();
    const { id } = await params;
    await OrganizationService.getElectionOrFail(id, user.organizationId!);

    const body = await request.json();
    const parsed = observerSchema.parse(body);

    // Find or create a user with OBSERVER role in this org
    let observerUser = await db.user.findFirst({
      where: { email: parsed.email, organizationId: user.organizationId },
    });

    if (!observerUser) {
      observerUser = await db.user.create({
        data: {
          email: parsed.email,
          name: parsed.name,
          passwordHash: "", // Observers are invited, not password-authenticated yet
          role: "OBSERVER",
          organizationId: user.organizationId,
          isActive: true,
        },
      });
    } else if (observerUser.role !== "OBSERVER" && observerUser.role !== "AUDITOR") {
      return fail(
        "This user already has an admin role. Assign observers to separate email accounts.",
        "ROLE_CONFLICT",
        409
      );
    }

    // Check if already an observer for this election
    const existing = await db.observer.findUnique({
      where: {
        userId_electionId: {
          userId: observerUser.id,
          electionId: id,
        },
      },
    });
    if (existing) {
      return fail("This user is already an observer for this election.", "DUPLICATE", 409);
    }

    const observer = await db.observer.create({
      data: {
        userId: observerUser.id,
        electionId: id,
        permissions: JSON.stringify({
          viewResults: true,
          viewTurnout: true,
          viewAudit: false,
          manageVoters: false,
        }),
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            role: true,
            isActive: true,
            lastLoginAt: true,
          },
        },
      },
    });

    return ok({ observer }, 201);
  } catch (e) {
    return handleError(e);
  }
}
