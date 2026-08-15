"use client";

import { useEffect, useState, useCallback } from "react";
import { motion } from "framer-motion";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { PageHeader } from "@/components/dashboard/page-header";
import { ColoredBadge, ROLE_TONE } from "@/components/dashboard/colored-badge";
import {
  EmptyState,
  ErrorState,
} from "@/components/dashboard/dashboard-skeleton";
import { apiFetch } from "@/lib/api-fetch";
import { toast } from "sonner";
import { cn, formatRelative, initials } from "@/lib/utils";
import {
  UserCog,
  Loader2,
  ShieldCheck,
  ShieldOff,
} from "lucide-react";
import type { UserDTO } from "@/components/dashboard/types";

interface AdminUserDTO extends UserDTO {
  createdAt?: string;
}

const ROLE_OPTIONS: { value: string; label: string }[] = [
  { value: "ORG_OWNER", label: "Org owner" },
  { value: "ORG_ADMIN", label: "Org admin" },
  { value: "ELECTION_MANAGER", label: "Election manager" },
  { value: "ELECTION_OFFICER", label: "Election officer" },
  { value: "OBSERVER", label: "Observer" },
  { value: "AUDITOR", label: "Auditor" },
];

const ROLE_LABELS: Record<string, string> = Object.fromEntries(
  ROLE_OPTIONS.map((r) => [r.value, r.label])
);

export default function UsersPage() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [users, setUsers] = useState<AdminUserDTO[]>([]);
  const [me, setMe] = useState<UserDTO | null>(null);
  const [savingId, setSavingId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    const [usersRes, meRes] = await Promise.all([
      apiFetch<{ users: AdminUserDTO[] }>("/api/admin/users"),
      apiFetch<{ user: UserDTO | null }>("/api/auth/me"),
    ]);
    setLoading(false);
    if (usersRes.success && usersRes.data) {
      setUsers(usersRes.data.users);
    } else {
      setError(usersRes.error?.message ?? "Could not load users");
    }
    if (meRes.success && meRes.data) {
      setMe(meRes.data.user);
    }
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (cancelled) return;
      await load();
    })();
    return () => {
      cancelled = true;
    };
  }, [load]);

  async function changeRole(u: AdminUserDTO, role: string) {
    if (role === u.role) return;
    setSavingId(u.id);
    const res = await apiFetch(`/api/admin/users/${u.id}`, {
      method: "PATCH",
      body: JSON.stringify({ role }),
    });
    setSavingId(null);
    if (!res.success) {
      toast.error("Could not change role", { description: res.error?.message });
      return;
    }
    setUsers((prev) => prev.map((x) => (x.id === u.id ? { ...x, role } : x)));
    toast.success(`${u.name} is now ${ROLE_LABELS[role] ?? role}`);
  }

  async function toggleActive(u: AdminUserDTO) {
    if (me?.id === u.id) return; // cannot self-deactivate
    setSavingId(u.id);
    const res = await apiFetch(`/api/admin/users/${u.id}`, {
      method: "PATCH",
      body: JSON.stringify({ isActive: !u.isActive }),
    });
    setSavingId(null);
    if (!res.success) {
      toast.error("Could not update user", { description: res.error?.message });
      return;
    }
    setUsers((prev) =>
      prev.map((x) => (x.id === u.id ? { ...x, isActive: !u.isActive } : x))
    );
    toast.success(`${u.name} ${u.isActive ? "deactivated" : "activated"}`);
  }

  return (
    <div className="flex-1 space-y-6 p-4 sm:p-6 lg:p-8">
      <PageHeader
        eyebrow="Users"
        title="Organization members"
        description="Manage who has access, their role, and active state. You cannot deactivate or demote yourself."
      />

      {loading ? (
        <div className="space-y-2">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="h-14 animate-pulse rounded-lg bg-muted" />
          ))}
        </div>
      ) : error ? (
        <ErrorState message={error} onRetry={load} />
      ) : users.length === 0 ? (
        <Card>
          <CardContent className="py-2">
            <EmptyState
              title="No members yet"
              description="Invite teammates so they can collaborate on elections."
              icon={UserCog}
            />
          </CardContent>
        </Card>
      ) : (
        <Card className="overflow-hidden">
          <ScrollArea className="scroll-area-custom max-h-[65vh]">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="min-w-[220px]">Member</TableHead>
                  <TableHead className="hidden min-w-[180px] md:table-cell">
                    Email
                  </TableHead>
                  <TableHead className="min-w-[160px]">Role</TableHead>
                  <TableHead className="hidden min-w-[120px] sm:table-cell">
                    Last login
                  </TableHead>
                  <TableHead className="text-right">Active</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {users.map((u, i) => {
                  const isSelf = me?.id === u.id;
                  return (
                    <motion.tr
                      key={u.id}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ duration: 0.2, delay: Math.min(i * 0.02, 0.2) }}
                      className="border-b last:border-0 hover:bg-accent/40"
                    >
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <Avatar className="size-9">
                            <AvatarFallback
                              className={cn(
                                "text-xs",
                                u.isActive
                                  ? "bg-primary/10 text-primary"
                                  : "bg-muted text-muted-foreground"
                              )}
                            >
                              {initials(u.name)}
                            </AvatarFallback>
                          </Avatar>
                          <div className="min-w-0">
                            <p className="flex items-center gap-2 truncate text-sm font-medium">
                              {u.name}
                              {isSelf && (
                                <span className="rounded-full bg-primary/10 px-1.5 py-0.5 text-[10px] font-medium text-primary">
                                  You
                                </span>
                              )}
                            </p>
                            <p className="truncate text-xs text-muted-foreground md:hidden">
                              {u.email}
                            </p>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="hidden md:table-cell">
                        <span className="truncate text-sm text-muted-foreground">
                          {u.email}
                        </span>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          {u.role === "PLATFORM_ADMIN" ? (
                            <ColoredBadge
                              value={u.role}
                              tone={ROLE_TONE[u.role] ?? "primary"}
                              pulse
                            />
                          ) : (
                            <Select
                              value={u.role}
                              onValueChange={(v) => changeRole(u, v)}
                              disabled={isSelf || savingId === u.id}
                            >
                              <SelectTrigger size="sm" className="w-[180px]">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                {ROLE_OPTIONS.map((r) => (
                                  <SelectItem key={r.value} value={r.value}>
                                    {r.label}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          )}
                          {savingId === u.id && (
                            <Loader2 className="h-3.5 w-3.5 animate-spin text-muted-foreground" />
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="hidden sm:table-cell text-xs text-muted-foreground">
                        {u.lastLoginAt ? formatRelative(u.lastLoginAt) : "Never"}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-2">
                          {isSelf ? (
                            <TooltipProvider delayDuration={200}>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <span>
                                    <Switch
                                      checked={u.isActive}
                                      disabled
                                      aria-label="Active state — locked for your own account"
                                    />
                                  </span>
                                </TooltipTrigger>
                                <TooltipContent side="left" className="text-xs">
                                  You cannot deactivate your own account
                                </TooltipContent>
                              </Tooltip>
                            </TooltipProvider>
                          ) : (
                            <Switch
                              checked={u.isActive}
                              onCheckedChange={() => toggleActive(u)}
                              disabled={savingId === u.id}
                              aria-label={`${u.isActive ? "Deactivate" : "Activate"} ${u.name}`}
                            />
                          )}
                          {u.isActive ? (
                            <ShieldCheck className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                          ) : (
                            <ShieldOff className="h-4 w-4 text-muted-foreground" />
                          )}
                        </div>
                      </TableCell>
                    </motion.tr>
                  );
                })}
              </TableBody>
            </Table>
          </ScrollArea>
        </Card>
      )}
    </div>
  );
}
