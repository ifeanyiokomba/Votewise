import { ok, handleError } from "@/lib/api-response";
import { db } from "@/lib/db";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { reference } = body as { reference: string };
    const notification = await db.notification.findFirst({
      where: {
        metadata: { contains: reference },
        subject: { contains: "Vote received" },
      },
      orderBy: { createdAt: "desc" },
    });
    return ok({
      verified: !!notification,
      reference,
      timestamp: notification?.sentAt ?? null,
    });
  } catch (e) {
    return handleError(e);
  }
}
