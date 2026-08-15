"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { DashboardShell } from "@/components/dashboard/dashboard-shell";
import { apiFetch } from "@/lib/api-fetch";
import type { MeResponse, UserDTO, OrganizationDTO } from "@/components/dashboard/types";
import { DashboardSkeleton } from "@/components/dashboard/dashboard-skeleton";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const [user, setUser] = useState<UserDTO | null>(null);
  const [organization, setOrganization] = useState<OrganizationDTO | null>(null);
  const [authChecked, setAuthChecked] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const meRes = await apiFetch<MeResponse>("/api/auth/me");
      if (cancelled) return;
      if (!meRes.success || !meRes.data?.user) {
        // Not signed in — redirect to login.
        router.replace("/login?next=/dashboard");
        return;
      }
      setUser(meRes.data.user);
      setOrganization(meRes.data.organization);
      setAuthChecked(true);
    })();
    return () => {
      cancelled = true;
    };
  }, [router]);

  if (!authChecked) {
    return <DashboardSkeleton />;
  }

  return (
    <DashboardShell user={user} organization={organization}>
      {children}
    </DashboardShell>
  );
}
