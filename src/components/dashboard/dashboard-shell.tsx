"use client";

import React, { useState, useEffect, lazy, Suspense } from "react";
import { useRouter } from "next/navigation";
import { usePathname } from "next/navigation";
import { AppSidebar } from "./app-sidebar";
import { AppTopbar } from "./app-topbar";
import {
  Sheet,
  SheetContent,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import { apiFetch } from "@/lib/api-fetch";
import type { NotificationDTO, UserDTO, OrganizationDTO } from "./types";

// Lazy-load heavy components to prevent OOM during compilation.
// These components pull in socket.io-client, framer-motion, and other
// heavy deps — eager-loading them causes Turbopack to compile everything
// at once, exceeding the sandbox's 4GB RAM.
const CreateElectionDialog = lazy(() =>
  import("./create-election-dialog").then((m) => ({ default: m.CreateElectionDialog }))
);
const CommandPalette = lazy(() =>
  import("./command-palette").then((m) => ({ default: m.CommandPalette }))
);
const SupportChatWidget = lazy(() =>
  import("@/components/shared/support-chat-widget").then((m) => ({ default: m.SupportChatWidget }))
);

interface DashboardShellProps {
  user: UserDTO | null;
  organization: OrganizationDTO | null;
  children: React.ReactNode;
  /** page title for the topbar */
  title?: string;
}

const DEFAULT_TITLES: Record<string, string> = {
  "/dashboard": "Overview",
  "/dashboard/elections": "Elections",
  "/dashboard/voters": "Voters",
  "/dashboard/voter-activity": "Voter Activity",
  "/dashboard/compare": "Compare Elections",
  "/dashboard/support": "Support",
  "/dashboard/audit": "Audit Log",
  "/dashboard/security": "Security",
  "/dashboard/users": "Users",
  "/dashboard/subscription": "Subscription",
  "/dashboard/notifications": "Notifications",
  "/dashboard/settings": "Settings",
  "/dashboard/commercial": "Negotiations",
  "/dashboard/providers": "Provider Configuration",
  "/dashboard/live-chat": "Live Support Chat",
};

function resolveTitle(pathname: string): string {
  if (pathname.startsWith("/dashboard/elections/")) return "Election Command Center";
  return DEFAULT_TITLES[pathname] ?? "Dashboard";
}

export function DashboardShell({
  user,
  organization,
  children,
  title,
}: DashboardShellProps) {
  const router = useRouter();
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [createOpen, setCreateOpen] = useState(false);
  const [cmdOpen, setCmdOpen] = useState(false);
  const [unread, setUnread] = useState(0);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const notifRes = await apiFetch<{ notifications: NotificationDTO[] }>(
        "/api/notifications"
      );
      if (cancelled) return;
      if (notifRes.success && notifRes.data) {
        setUnread(
          notifRes.data.notifications.filter(
            (n) => n.status === "QUEUED" || n.status === "SENT"
          ).length
        );
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  // Cmd+K / Ctrl+K to open command palette
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        setCmdOpen((prev) => !prev);
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);

  const pageTitle = title ?? resolveTitle(pathname);

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <div className="flex flex-1">
        {/* Desktop sidebar */}
        <aside className="hidden w-64 shrink-0 border-r lg:block">
          <div className="sticky top-0 h-screen">
            <AppSidebar
              user={user}
              organization={organization}
              onCreateElection={() => setCreateOpen(true)}
            />
          </div>
        </aside>

        {/* Mobile sidebar */}
        <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
          <SheetContent side="left" className="w-72 p-0">
            <SheetTitle className="sr-only">Navigation</SheetTitle>
            <SheetDescription className="sr-only">
              Workspace navigation
            </SheetDescription>
            <AppSidebar
              user={user}
              organization={organization}
              onNavigate={() => setMobileOpen(false)}
              onCreateElection={() => {
                setMobileOpen(false);
                setCreateOpen(true);
              }}
            />
          </SheetContent>
        </Sheet>

        {/* Main column */}
        <div className="flex min-w-0 flex-1 flex-col overflow-x-hidden">
          <AppTopbar
            user={user}
            pageTitle={pageTitle}
            onOpenSidebar={() => setMobileOpen(true)}
            unreadNotifications={unread}
            onOpenCommand={() => setCmdOpen(true)}
          />
          <main className="flex-1">{children}</main>
        </div>
      </div>

      <footer className="mt-auto border-t bg-background px-4 py-4 text-center text-xs text-muted-foreground sm:px-6">
        <p>
          © {new Date().getFullYear()} Votewise · A product of{" "}
          <a href="https://okomba.com" target="_blank" rel="noopener noreferrer" className="font-medium text-primary hover:underline">Okomba Analytics</a>.
          {user ? (
            <span className="ml-2 hidden sm:inline">
              · Signed in as <span className="font-medium text-foreground">{user.email}</span>
            </span>
          ) : null}
        </p>
      </footer>

      <Suspense fallback={null}>
        <CreateElectionDialog
          open={createOpen}
          onOpenChange={setCreateOpen}
          onCreated={(electionId) => {
            setCreateOpen(false);
            router.push(`/dashboard/elections/${electionId}`);
          }}
        />
      </Suspense>

      <Suspense fallback={null}>
        <CommandPalette
          open={cmdOpen}
          onOpenChange={setCmdOpen}
          isPlatformAdmin={user?.role === "PLATFORM_ADMIN"}
          onCreateElection={() => setCreateOpen(true)}
        />
      </Suspense>

      {/* Floating support chat widget — lazy to avoid loading socket.io on every page */}
      <Suspense fallback={null}>
        <SupportChatWidget />
      </Suspense>
    </div>
  );
}
