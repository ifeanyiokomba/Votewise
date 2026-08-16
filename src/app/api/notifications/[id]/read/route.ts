import { ok, handleError } from "@/lib/api-response";
import { requireOrgMember } from "@/lib/session";
import { db } from "@/lib/db";

type Params = { params: Promise<{ id: string }> };

export async function POST(_req: Request, { params }: Params) {
  try {
    const user = await requireOrgMember();
    const { id } = await params;
    await db.notification.update({
      where: { id },
      data: { status: "DELIVERED", deliveredAt: new Date() },
    });
    return ok({ read: true });
  } catch (e) {
    return handleError(e);
  }
}
