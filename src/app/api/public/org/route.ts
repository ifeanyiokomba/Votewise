import { ok, handleError, fail } from "@/lib/api-response";
import { db } from "@/lib/db";
import { safeJsonParse } from "@/lib/utils";

/**
 * Public organization profile — fetches org by slug or custom domain.
 * Returns branding, logo, name, description, and live election info.
 */
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const slug = searchParams.get("slug");
    const domain = searchParams.get("domain");

    let org;
    if (slug) {
      org = await db.organization.findUnique({
        where: { slug },
        select: {
          id: true,
          name: true,
          slug: true,
          logo: true,
          description: true,
          domain: true,
          contactInfo: true,
          branding: true,
        },
      });
    } else if (domain) {
      org = await db.organization.findFirst({
        where: { domain },
        select: {
          id: true,
          name: true,
          slug: true,
          logo: true,
          description: true,
          domain: true,
          contactInfo: true,
          branding: true,
        },
      });
    }

    if (!org) return fail("Organization not found", "NOT_FOUND", 404);

    // Fetch LIVE elections with candidates (headshots)
    const liveElections = await db.election.findMany({
      where: { organizationId: org.id, status: "LIVE" },
      select: {
        id: true,
        name: true,
        description: true,
        startTime: true,
        endTime: true,
        type: true,
        _count: { select: { voters: true, votes: true } },
        positions: {
          select: {
            id: true,
            title: true,
            order: true,
            candidates: {
              select: {
                id: true,
                name: true,
                photo: true,
                bio: true,
                manifesto: true,
              },
            },
          },
          orderBy: { order: "asc" },
        },
      },
    });

    // Also fetch upcoming elections
    const upcomingElections = await db.election.findMany({
      where: {
        organizationId: org.id,
        status: { in: ["SCHEDULED", "READY"] },
      },
      select: {
        id: true,
        name: true,
        description: true,
        startTime: true,
        endTime: true,
        type: true,
      },
      orderBy: { startTime: "asc" },
    });

    return ok({
      organization: org,
      liveElections,
      upcomingElections,
    });
  } catch (e) {
    return handleError(e);
  }
}
