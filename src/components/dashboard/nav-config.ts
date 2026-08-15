import type { LucideIcon } from "lucide-react";
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
} from "lucide-react";

export interface NavItem {
  label: string;
  href: string;
  icon: LucideIcon;
  badge?: string;
  comingSoon?: boolean;
}

export const PRIMARY_NAV: NavItem[] = [
  { label: "Overview", href: "/dashboard", icon: LayoutDashboard },
  { label: "Elections", href: "/dashboard/elections", icon: Vote },
  { label: "Voters", href: "/dashboard/voters", icon: Users },
  { label: "Support", href: "/dashboard/support", icon: LifeBuoy },
  { label: "Audit Log", href: "/dashboard/audit", icon: ScrollText },
  { label: "Security", href: "/dashboard/security", icon: ShieldCheck },
  { label: "Users", href: "/dashboard/users", icon: UserCog },
  { label: "Subscription", href: "/dashboard/subscription", icon: CreditCard },
  { label: "Notifications", href: "/dashboard/notifications", icon: Bell },
  { label: "Settings", href: "/dashboard/settings", icon: Settings },
];

export const PLATFORM_NAV: NavItem[] = [
  { label: "Platform Admin", href: "/dashboard/commercial", icon: Building2 },
];

// Tab config for the election command center
export const ELECTION_TABS = [
  { label: "Overview", value: "overview", href: "" },
  { label: "Positions", value: "positions", href: "/positions" },
  { label: "Candidates", value: "candidates", href: "/candidates" },
  { label: "Voters", value: "voters", href: "/voters" },
  { label: "Results", value: "results", href: "/results" },
  { label: "Activate", value: "activate", href: "/activate" },
] as const;

export type ElectionTabValue = (typeof ELECTION_TABS)[number]["value"];
