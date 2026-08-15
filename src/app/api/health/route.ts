import { NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function GET() {
  try {
    await db.$queryRaw`SELECT 1`;
    return NextResponse.json({ success: true, data: { status: "ok", db: "connected" } });
  } catch (e) {
    return NextResponse.json(
      { success: false, error: { message: "Database unreachable", code: "DB_ERROR" } },
      { status: 500 }
    );
  }
}
