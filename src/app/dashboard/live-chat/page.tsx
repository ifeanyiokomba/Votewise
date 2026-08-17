"use client";

import { useEffect, useState, lazy, Suspense } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { PageHeader } from "@/components/dashboard/page-header";
import { apiFetch } from "@/lib/api-fetch";

const AdminChatDashboard = lazy(() =>
  import("@/components/dashboard/admin-chat-dashboard").then((m) => ({
    default: m.AdminChatDashboard,
  }))
);

interface MeResponse {
  user: { id: string; name: string };
}

export default function LiveChatPage() {
  const [me, setMe] = useState<MeResponse | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const res = await apiFetch<MeResponse>("/api/auth/me");
      setLoading(false);
      if (res.success && res.data) {
        setMe(res.data);
      }
    })();
  }, []);

  if (loading || !me?.user) {
    return (
      <div className="flex-1 space-y-6 p-4 sm:p-6 lg:p-8">
        <Skeleton className="h-16 w-full" />
        <div className="grid gap-4 lg:grid-cols-[320px_1fr]">
          <Skeleton className="h-[calc(100dvh-9rem)]" />
          <Skeleton className="h-[calc(100dvh-9rem)]" />
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 space-y-6 p-4 sm:p-6 lg:p-8">
      <PageHeader
        eyebrow="Platform Admin"
        title="Live Support Inbox"
        description="Real-time voter support chat. Messages from voters appear instantly here."
      />
      <Suspense
        fallback={
          <div className="grid gap-4 lg:grid-cols-[320px_1fr]">
            <Skeleton className="h-[calc(100dvh-9rem)]" />
            <Skeleton className="h-[calc(100dvh-9rem)]" />
          </div>
        }
      >
        <AdminChatDashboard adminId={me.user.id} adminName={me.user.name} />
      </Suspense>
    </div>
  );
}
