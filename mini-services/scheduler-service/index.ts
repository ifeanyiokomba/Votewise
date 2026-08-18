/**
 * Votewise Election Scheduler (VW-005 Fixed)
 *
 * SECURITY: This service does NOT connect directly to the database.
 * Instead, it calls an authenticated internal API endpoint on the main
 * Next.js app, which performs the transitions after verifying a shared
 * secret (SCHEDULER_AUTH_TOKEN). This means:
 * - The scheduler has no DB credentials
 * - All transitions go through the main app's authorization layer
 * - The main app can log, validate, and reject transitions
 *
 * Periodically calls POST /api/internal/scheduler/transition with the
 * shared secret to process due election status transitions.
 */

const POLL_INTERVAL_MS = 60_000;
const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? "https://votewise.com.ng";
const AUTH_TOKEN = process.env.SCHEDULER_AUTH_TOKEN;

if (!AUTH_TOKEN) {
  console.error("❌ SCHEDULER_AUTH_TOKEN must be set.");
  process.exit(1);
}

async function pollAndTransition() {
  try {
    const response = await fetch(`${APP_URL}/api/internal/scheduler/transition`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Scheduler-Auth": AUTH_TOKEN,
      },
    });

    if (!response.ok) {
      console.error(`[scheduler] API returned ${response.status}: ${await response.text()}`);
      return;
    }

    const data = await response.json();
    if (data.success && data.data?.transitions > 0) {
      console.log(
        `[scheduler] ${new Date().toISOString()} — ${data.data.transitions} transition(s): ` +
        `${data.data.started} started, ${data.data.closed} closed, ${data.data.missed} missed-window.`
      );
    }
  } catch (e) {
    console.error("[scheduler] poll error:", e instanceof Error ? e.message : e);
  }
}

async function main() {
  console.log(
    `✓ Votewise scheduler service started — polling every ${POLL_INTERVAL_MS / 1000}s`
  );
  console.log(`  Target: ${APP_URL}/api/internal/scheduler/transition`);

  await pollAndTransition();
  setInterval(() => {
    pollAndTransition().catch((e) =>
      console.error("[scheduler] unhandled error:", e)
    );
  }, POLL_INTERVAL_MS);
}

main().catch((e) => {
  console.error("[scheduler] fatal error:", e);
  process.exit(1);
});
