"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Logo } from "@/components/shared/logo";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import { Plus, Building2, Sparkles } from "lucide-react";
import { PRIMARY_NAV, PLATFORM_NAV, type NavItem } from "./nav-config";
import type { OrganizationDTO, UserDTO } from "./types";

interface AppSidebarProps {
  user: UserDTO | null;
  organization: OrganizationDTO | null;
  onNavigate?: () => void;
  onCreateElection?: () => void;
  className?: string;
}

function NavList({
  items,
  pathname,
  onNavigate,
}: {
  items: NavItem[];
  pathname: string;
  onNavigate?: () => void;
}) {
  return (
    <nav className="grid gap-0.5">
      {items.map((item) => {
        const isActive =
          item.href === "/dashboard"
            ? pathname === "/dashboard"
            : pathname === item.href || pathname.startsWith(item.href + "/");
        const Icon = item.icon;
        const link = (
          <Link
            href={item.href}
            onClick={onNavigate}
            aria-current={isActive ? "page" : undefined}
            className={cn(
              "group flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
              "text-muted-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
              isActive &&
                "bg-sidebar-accent text-sidebar-accent-foreground",
              item.comingSoon && "opacity-60"
            )}
          >
            <Icon
              className={cn(
                "h-4 w-4 shrink-0 transition-colors",
                isActive ? "text-primary" : "text-muted-foreground group-hover:text-sidebar-accent-foreground"
              )}
            />
            <span className="flex-1 truncate">{item.label}</span>
            {item.comingSoon && (
              <Badge variant="outline" className="h-4 px-1 text-[10px] font-normal text-muted-foreground">
                soon
              </Badge>
            )}
          </Link>
        );
        return (
          <Tooltip key={item.href + item.label} delayDuration={300}>
            <TooltipTrigger asChild>{link}</TooltipTrigger>
            <TooltipContent side="right" className="text-xs">
              {item.label}
            </TooltipContent>
          </Tooltip>
        );
      })}
    </nav>
  );
}

export function AppSidebar({
  user,
  organization,
  onNavigate,
  onCreateElection,
  className,
}: AppSidebarProps) {
  const pathname = usePathname();
  const isPlatformAdmin = user?.role === "PLATFORM_ADMIN";
  const tier = organization?.subscriptionTier ?? "FREE";

  return (
    <TooltipProvider delayDuration={200}>
      <div
        className={cn(
          "flex h-full flex-col bg-sidebar text-sidebar-foreground",
          className
        )}
      >
        <div className="flex h-16 shrink-0 items-center border-b px-5">
          <Link href="/dashboard" onClick={onNavigate} className="flex items-center">
            <Logo size="md" />
          </Link>
        </div>

        <div className="px-3 py-4">
          <Button
            onClick={() => {
              onNavigate?.();
              onCreateElection?.();
            }}
            className="w-full justify-start gap-2"
            size="default"
          >
            <Plus className="h-4 w-4" />
            Create election
          </Button>
        </div>

        <Separator className="mx-3" />

        <ScrollArea className="flex-1 scroll-area-custom">
          <div className="px-3 py-3">
            <p className="px-3 pb-1 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
              Workspace
            </p>
            <NavList items={PRIMARY_NAV} pathname={pathname} onNavigate={onNavigate} />

            {isPlatformAdmin && (
              <>
                <p className="px-3 pb-1 pt-5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                  Platform
                </p>
                <NavList items={PLATFORM_NAV} pathname={pathname} onNavigate={onNavigate} />
              </>
            )}
          </div>
        </ScrollArea>

        <Separator className="mx-3" />

        <div className="px-4 py-4">
          {organization ? (
            <Link
              href="/dashboard/settings"
              onClick={onNavigate}
              className="group block rounded-lg border bg-gradient-to-br from-primary/5 via-background to-background p-3 transition-all hover:border-primary/30 hover:shadow-sm"
            >
              <div className="flex items-center gap-2">
                <div className="grid h-8 w-8 shrink-0 place-items-center rounded-md bg-primary/10 text-primary ring-1 ring-primary/10 transition-colors group-hover:bg-primary/15">
                  <Building2 className="h-4 w-4" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold">{organization.name}</p>
                  <p className="truncate text-xs text-muted-foreground">/{organization.slug}</p>
                </div>
              </div>
              <div className="mt-3">
                <Badge
                  variant="outline"
                  className={cn(
                    "w-full justify-center gap-1.5 text-[10px] uppercase tracking-wide",
                    "border-primary/30 bg-primary/10 text-primary"
                  )}
                >
                  <Sparkles className="h-2.5 w-2.5" />
                  {tier} plan
                </Badge>
              </div>
            </Link>
          ) : (
            <div className="rounded-lg border bg-muted/30 p-3 text-xs text-muted-foreground">
              No organization attached.
            </div>
          )}
        </div>
      </div>
    </TooltipProvider>
  );
}
