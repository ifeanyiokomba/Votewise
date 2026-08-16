"use client";

import { lazy, Suspense } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { PageHeader } from "@/components/dashboard/page-header";

const ProviderManagementPanel = lazy(() =>
  import("@/components/dashboard/provider-management-panel").then((m) => ({
    default: m.ProviderManagementPanel,
  }))
);

export default function ProvidersPage() {
  return (
    <div className="flex-1 space-y-6 p-4 sm:p-6 lg:p-8">
      <PageHeader
        eyebrow="Platform Admin"
        title="Provider Configuration"
        description="Manage email, SMS, and WhatsApp providers. Credentials are encrypted at rest with AES-256-GCM."
      />
      <Suspense
        fallback={
          <div className="space-y-4">
            <Skeleton className="h-8 w-48" />
            <div className="grid gap-4 sm:grid-cols-3">
              <Skeleton className="h-48" />
              <Skeleton className="h-48" />
              <Skeleton className="h-48" />
            </div>
          </div>
        }
      >
        <ProviderManagementPanel />
      </Suspense>
    </div>
  );
}
