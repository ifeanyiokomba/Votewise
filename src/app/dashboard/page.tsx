"use client";

import { useEffect, useState, useCallback } from "react";
import dynamic from "next/dynamic";
import { apiFetch } from "@/lib/api-fetch";
import { DashboardSkeleton } from "@/components/dashboard/dashboard-skeleton";
import type { MeResponse } from "@/components/dashboard/types";

// ─── Lazy-loaded dashboards ──────────────────────────────────────────
// This is CRITICAL for performance: by lazy-loading these heavy components,
// Turbopack only compiles the one that's actually needed. A platform admin
// visiting /dashboard won't trigger compilation of the org dashboard's
// ElectionCard, LiveActivityFeed, EngagementLeaderboard, etc. — and vice
// versa. This prevents OOM in the dev sandbox and speeds up first paint
// in production.
const PlatformAdminDashboard = dynamic(
  () => import("@/components/dashboard/platform-admin-dashboard").then((m) => m.PlatformAdminDashboard),
  { loading: () => <DashboardSkeleton /> }
);

const OrgDashboardContent = dynamic(
  () => import("@/components/dashboard/org-dashboard-content").then((m) => m.OrgDashboardContent),
  { loading: () => <DashboardSkeleton /> }
);

export default function OverviewPage() {
  const [me, setMe] = useState<MeResponse | null>(null);
  const [authChecked, setAuthChecked] = useState(false);

  const load = useCallback(async () => {
    const meRes = await apiFetch<MeResponse>("/api/auth/me");
    setAuthChecked(true);
    if (meRes.success && meRes.data?.user) {
      setMe(meRes.data);
    }
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (cancelled) return;
      await load();
    })();
    return () => { cancelled = true; };
  }, [load]);

  // Show skeleton while checking auth
  if (!authChecked) {
    return <DashboardSkeleton />;
  }

  // Not authenticated — the proxy/layout will redirect to login
  if (!me?.user) {
    return <DashboardSkeleton />;
  }

  // Platform Admin gets a dedicated operations console
  if (me.user.role === "PLATFORM_ADMIN") {
    return <PlatformAdminDashboard userName={me.user.name} />;
  }

  // Org users (ORG_OWNER, ORG_ADMIN, ELECTION_MANAGER, etc.) get the org dashboard
  return <OrgDashboardContent me={me} />;
}
