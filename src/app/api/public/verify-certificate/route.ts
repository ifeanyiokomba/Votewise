import { ok, handleError, fail } from "@/lib/api-response";
import { db } from "@/lib/db";

/**
 * Public certificate verification API.
 *
 * Given a receipt reference, verifies that a ballot was received and returns
 * certificate-safe metadata (election name, organization, timestamp).
 * Never exposes voter identity or ballot choices.
 */
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { reference } = body as { reference: string };

    if (!reference) {
      return fail("Reference is required", "BAD_REQUEST", 400);
    }

    // Find the notification that stored the receipt reference
    const notification = await db.notification.findFirst({
      where: {
        metadata: { contains: reference },
        subject: { contains: "Vote received" },
      },
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        sentAt: true,
        createdAt: true,
        recipient: true,
        election: {
          select: {
            id: true,
            name: true,
            description: true,
            status: true,
            endTime: true,
            organization: {
              select: { name: true, slug: true },
            },
          },
        },
      },
    });

    if (!notification || !notification.election) {
      return ok({
        verified: false,
        reference,
        message: "No ballot found with this reference.",
      });
    }

    return ok({
      verified: true,
      reference,
      election: {
        id: notification.election.id,
        name: notification.election.name,
        status: notification.election.status,
      },
      organization: {
        name: notification.election.organization.name,
        slug: notification.election.organization.slug,
      },
      issuedAt: notification.sentAt ?? notification.createdAt,
      // Voter email is masked for privacy in public verification
      voterEmailMasked: maskEmail(notification.recipient),
    });
  } catch (e) {
    return handleError(e);
  }
}

function maskEmail(email: string): string {
  const [name, domain] = email.split("@");
  if (!domain) return email;
  const masked =
    name.length <= 2
      ? name[0] + "***"
      : name.slice(0, 2) + "***" + name.slice(-1);
  return `${masked}@${domain}`;
}
