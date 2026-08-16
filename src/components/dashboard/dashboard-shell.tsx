"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { usePathname } from "next/navigation";
import { AppSidebar } from "./app-sidebar";
import { AppTopbar } from "./app-topbar";
import { CreateElectionDialog } from "./create-election-dialog";
import { CommandPalette } from "./command-palette";
import { SupportChatWidget } from "@/components/shared/support-chat-widget";
import {
  Sheet,
  SheetContent,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import { apiFetch } from "@/lib/api-fetch";
import type { NotificationDTO, UserDTO, OrganizationDTO } from "./types";

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
  "/dashboard/compare": "Compare Elections",
  "/dashboard/support": "Support",
  "/dashboard/audit": "Audit Log",
  "/dashboard/security": "Security",
  "/dashboard/users": "Users",
  "/dashboard/subscription": "Subscription",
  "/dashboard/notifications": "Notifications",
  "/dashboard/settings": "Settings",
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
        <div className="flex min-w-0 flex-1 flex-col">
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
          © {new Date().getFullYear()} Votewise · A product of Okomba Analytics.
          {user ? (
            <span className="ml-2 hidden sm:inline">
              · Signed in as <span className="font-medium text-foreground">{user.email}</span>
            </span>
          ) : null}
        </p>
      </footer>

      <CreateElectionDialog
        open={createOpen}
        onOpenChange={setCreateOpen}
        onCreated={(electionId) => {
          setCreateOpen(false);
          router.push(`/dashboard/elections/${electionId}`);
        }}
      />

      <CommandPalette
        open={cmdOpen}
        onOpenChange={setCmdOpen}
        isPlatformAdmin={user?.role === "PLATFORM_ADMIN"}
        onCreateElection={() => setCreateOpen(true)}
      />

      {/* Floating support chat widget */}
      <SupportChatWidget />
    </div>
  );
}
