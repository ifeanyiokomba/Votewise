import { ok, handleError, fail } from "@/lib/api-response";
import { db } from "@/lib/db";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { reference } = body as { reference: string };
    if (!reference) return fail("Reference is required", "BAD_REQUEST", 400);

    // Look up the notification that stored the receipt reference
    const notification = await db.notification.findFirst({
      where: {
        metadata: { contains: reference },
        OR: [
          { subject: { contains: "Vote received" } },
          { subject: { contains: "received" } },
        ],
      },
      orderBy: { createdAt: "desc" },
    });

    const vote = await db.vote.findFirst({
      where: { ballotHash: { contains: reference } },
    });

    const verified = !!(notification || vote);
    return ok({
      verified,
      reference,
      timestamp: notification?.sentAt ?? vote?.castAt ?? null,
    });
  } catch (e) {
    return handleError(e);
  }
}
