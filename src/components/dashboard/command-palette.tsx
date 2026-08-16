"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from "@/components/ui/command";
import {
  LayoutDashboard,
  Vote,
  Users,
  LifeBuoy,
  ScrollText,
  ShieldCheck,
  UserCog,
  CreditCard,
  Bell,
  Settings,
  Building2,
  Plus,
  LogOut,
  Home,
  ExternalLink,
  Search,
  BarChart3,
  Activity,
  Settings2,
  MessageCircle,
} from "lucide-react";

interface CommandPaletteProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  isPlatformAdmin?: boolean;
  onCreateElection?: () => void;
}

const NAV_ITEMS = [
  { label: "Overview", href: "/dashboard", icon: LayoutDashboard, group: "Navigation" },
  { label: "Elections", href: "/dashboard/elections", icon: Vote, group: "Navigation" },
  { label: "Voters Directory", href: "/dashboard/voters", icon: Users, group: "Navigation" },
  { label: "Voter Activity", href: "/dashboard/voter-activity", icon: Activity, group: "Navigation" },
  { label: "Compare Elections", href: "/dashboard/compare", icon: BarChart3, group: "Navigation" },
  { label: "Support", href: "/dashboard/support", icon: LifeBuoy, group: "Navigation" },
  { label: "Audit Log", href: "/dashboard/audit", icon: ScrollText, group: "Navigation" },
  { label: "Security", href: "/dashboard/security", icon: ShieldCheck, group: "Navigation" },
  { label: "Users", href: "/dashboard/users", icon: UserCog, group: "Navigation" },
  { label: "Subscription", href: "/dashboard/subscription", icon: CreditCard, group: "Navigation" },
  { label: "Notifications", href: "/dashboard/notifications", icon: Bell, group: "Navigation" },
  { label: "Settings", href: "/dashboard/settings", icon: Settings, group: "Navigation" },
];

const PLATFORM_ITEMS = [
  { label: "Negotiations", href: "/dashboard/commercial", icon: Building2, group: "Platform" },
  { label: "Provider Configuration", href: "/dashboard/providers", icon: Settings2, group: "Platform" },
  { label: "Live Support Chat", href: "/dashboard/live-chat", icon: MessageCircle, group: "Platform" },
];

const QUICK_LINKS = [
  { label: "Back to Website", href: "/", icon: Home, group: "Quick Links" },
  { label: "Pricing", href: "/pricing", icon: ExternalLink, group: "Quick Links" },
];

export function CommandPalette({
  open,
  onOpenChange,
  isPlatformAdmin,
  onCreateElection,
}: CommandPaletteProps) {
  const router = useRouter();

  const run = (href: string) => {
    onOpenChange(false);
    router.push(href);
  };

  const groups = [
    { name: "Actions", items: [{ label: "Create New Election", icon: Plus, action: onCreateElection }] },
    { name: "Navigation", items: NAV_ITEMS },
    ...(isPlatformAdmin ? [{ name: "Platform", items: PLATFORM_ITEMS }] : []),
    { name: "Quick Links", items: QUICK_LINKS },
  ];

  return (
    <CommandDialog open={open} onOpenChange={onOpenChange}>
      <CommandInput placeholder="Search pages, actions..." />
      <CommandList>
        <CommandEmpty>No results found.</CommandEmpty>
        {groups.map((group, gi) => (
          <React.Fragment key={group.name}>
            <CommandGroup heading={group.name}>
              {group.items.map((item) => {
                const Icon = item.icon;
                if ("action" in item && item.action) {
                  return (
                    <CommandItem
                      key={item.label}
                      onSelect={() => {
                        onOpenChange(false);
                        item.action?.();
                      }}
                      className="gap-2"
                    >
                      <Icon className="h-4 w-4 text-primary" />
                      <span>{item.label}</span>
                    </CommandItem>
                  );
                }
                const navItem = item as { label: string; href: string; icon: typeof Home };
                return (
                  <CommandItem
                    key={navItem.label}
                    onSelect={() => run(navItem.href)}
                    className="gap-2"
                  >
                    <Icon className="h-4 w-4 text-muted-foreground" />
                    <span>{navItem.label}</span>
                  </CommandItem>
                );
              })}
            </CommandGroup>
            {gi < groups.length - 1 && <CommandSeparator />}
          </React.Fragment>
        ))}
        <CommandSeparator />
        <CommandGroup heading="Account">
          <CommandItem
            onSelect={() => {
              onOpenChange(false);
              fetch("/api/auth/logout", { method: "POST" }).then(() => router.push("/login"));
            }}
            className="gap-2 text-destructive"
          >
            <LogOut className="h-4 w-4" />
            <span>Sign out</span>
          </CommandItem>
        </CommandGroup>
      </CommandList>
    </CommandDialog>
  );
}
