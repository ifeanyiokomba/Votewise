import { PrismaClient } from "@prisma/client";

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

/**
 * SECURITY (VW-012): No .env file reading fallback.
 * DATABASE_URL must be set in the process environment. If it's missing or
 * doesn't start with "postgres", we throw immediately — fail fast, don't
 * silently connect to the wrong database.
 */
function getDatabaseUrl(): string {
  const url = process.env.DATABASE_URL;
  if (!url || !url.startsWith("postgres")) {
    throw new Error(
      "DATABASE_URL is not set or is not a valid PostgreSQL connection string. " +
        "Set it in your environment variables (e.g., Vercel → Settings → Environment Variables)."
    );
  }
  return url;
}

const databaseUrl = getDatabaseUrl();

export const db =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === "production" ? ["error"] : ["warn", "error"],
    datasources: { db: { url: databaseUrl } },
  });

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = db;
