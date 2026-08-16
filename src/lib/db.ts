import { PrismaClient } from "@prisma/client";

// ─────────────────────────────────────────────────────────────────────
// Database client bootstrap
//
// Next.js dev server (Turbopack) loads `.env` automatically, but in some
// sandbox/CI shells the parent process already exports a stale
// `DATABASE_URL` (e.g. `file:./db/custom.db` from an earlier SQLite run).
// That stale value wins over `.env`, causing Prisma to fail with
// "the URL must start with the protocol postgresql://".
//
// Mitigation: if the inherited DATABASE_URL doesn't start with `postgres`,
// fall back to reading it directly from `.env`.
// ─────────────────────────────────────────────────────────────────────

function resolveDatabaseUrl(): string | undefined {
  const inherited = process.env.DATABASE_URL;
  if (inherited && inherited.startsWith("postgres")) return inherited;

  // Read .env directly (only when needed — keeps prod fast)
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const fs = require("fs");
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const path = require("path");
    const envPath = path.join(process.cwd(), ".env");
    if (fs.existsSync(envPath)) {
      const raw = fs.readFileSync(envPath, "utf8");
      for (const line of raw.split("\n")) {
        const trimmed = line.trim();
        if (!trimmed || trimmed.startsWith("#")) continue;
        const eqIdx = trimmed.indexOf("=");
        if (eqIdx < 0) continue;
        const key = trimmed.slice(0, eqIdx).trim();
        const value = trimmed.slice(eqIdx + 1).trim().replace(/^["']|["']$/g, "");
        if (key === "DATABASE_URL" && value.startsWith("postgres")) {
          process.env.DATABASE_URL = value;
          return value;
        }
      }
    }
  } catch {
    // ignore — fall through to undefined
  }

  return inherited; // last resort (likely invalid)
}

const databaseUrl = resolveDatabaseUrl();

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

export const db =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === "production" ? ["error"] : ["warn", "error"],
    datasources: databaseUrl
      ? { db: { url: databaseUrl } }
      : undefined,
  });

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = db;
