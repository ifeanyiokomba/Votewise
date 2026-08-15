"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ThemeToggle } from "@/components/shared/theme-toggle";
import { apiFetch } from "@/lib/api-fetch";
import { cn, initials } from "@/lib/utils";
import { toast } from "sonner";
import { Bell, LogOut, Menu, Settings, User } from "lucide-react";
import Link from "next/link";
import type { UserDTO } from "./types";

interface AppTopbarProps {
  user: UserDTO | null;
  pageTitle: string;
  onOpenSidebar: () => void;
  unreadNotifications?: number;
  className?: string;
}

const ROLE_LABELS: Record<string, string> = {
  PLATFORM_ADMIN: "Platform Admin",
  ORG_OWNER: "Organization Owner",
  ORG_ADMIN: "Organization Admin",
  ELECTION_MANAGER: "Election Manager",
  ELECTION_OFFICER: "Election Officer",
  OBSERVER: "Observer",
  AUDITOR: "Auditor",
  VOTER: "Voter",
};

export function AppTopbar({
  user,
  pageTitle,
  onOpenSidebar,
  unreadNotifications = 0,
  className,
}: AppTopbarProps) {
  const router = useRouter();
  const [signingOut, setSigningOut] = useState(false);

  async function handleSignOut() {
    setSigningOut(true);
    const res = await apiFetch("/api/auth/logout", { method: "POST" });
    setSigningOut(false);
    if (!res.success) {
      toast.error("Could not sign out", { description: res.error?.message });
      return;
    }
    toast.success("Signed out");
    router.replace("/login");
  }

  const displayName = user?.name ?? "Guest";
  const displayEmail = user?.email ?? "";
  const roleLabel = user ? ROLE_LABELS[user.role] ?? user.role : "";

  return (
    <header
      className={cn(
        "sticky top-0 z-30 flex h-16 shrink-0 items-center gap-3 border-b bg-background/95 px-4 backdrop-blur supports-[backdrop-filter]:bg-background/75 sm:px-6",
        className
      )}
    >
      <Button
        variant="ghost"
        size="icon"
        className="lg:hidden"
        onClick={onOpenSidebar}
        aria-label="Open sidebar"
      >
        <Menu className="h-5 w-5" />
      </Button>

      <div className="min-w-0 flex-1">
        <h1 className="truncate text-base font-semibold tracking-tight sm:text-lg">
          {pageTitle}
        </h1>
      </div>

      <div className="flex items-center gap-1">
        <Button
          variant="ghost"
          size="icon"
          className="relative"
          aria-label="Notifications"
          asChild
        >
          <Link href="/dashboard/notifications">
            <Bell className="h-[1.1rem] w-[1.1rem]" />
            {unreadNotifications > 0 && (
              <span className="absolute right-1.5 top-1.5 flex h-2 w-2">
                <span className="absolute inline-flex h-2 w-2 animate-ping rounded-full bg-destructive opacity-75" />
                <span className="relative inline-flex h-2 w-2 rounded-full bg-destructive" />
              </span>
            )}
          </Link>
        </Button>

        <ThemeToggle />

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              className="ml-1 flex items-center gap-2 rounded-full pl-1 pr-2 transition-colors hover:bg-accent"
              aria-label="User menu"
            >
              <Avatar className="h-8 w-8 border">
                <AvatarFallback className="bg-primary/10 text-xs font-semibold text-primary">
                  {initials(displayName)}
                </AvatarFallback>
              </Avatar>
              <div className="hidden text-left sm:block">
                <p className="max-w-[12rem] truncate text-xs font-medium leading-tight">
                  {displayName}
                </p>
                <p className="max-w-[12rem] truncate text-[10px] text-muted-foreground">
                  {roleLabel}
                </p>
              </div>
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-60">
            <DropdownMenuLabel className="flex flex-col gap-0.5">
              <span className="truncate font-medium">{displayName}</span>
              <span className="truncate text-xs font-normal text-muted-foreground">
                {displayEmail}
              </span>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem asChild>
              <Link href="/dashboard/settings">
                <User className="mr-2 h-4 w-4" />
                Profile
              </Link>
            </DropdownMenuItem>
            <DropdownMenuItem asChild>
              <Link href="/dashboard/settings">
                <Settings className="mr-2 h-4 w-4" />
                Settings
              </Link>
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onClick={handleSignOut}
              disabled={signingOut}
              variant="destructive"
            >
              <LogOut className="mr-2 h-4 w-4" />
              {signingOut ? "Signing out…" : "Sign out"}
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}
