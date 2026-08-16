"use client";

import { useEffect, useState, useCallback, useMemo } from "react";
import { motion } from "framer-motion";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
import {
  ColoredBadge,
  NOTIFICATION_STATUS_TONE,
} from "@/components/dashboard/colored-badge";
import {
  EmptyState,
  ErrorState,
} from "@/components/dashboard/dashboard-skeleton";
import { apiFetch } from "@/lib/api-fetch";
import { toast } from "sonner";
import { cn, formatRelative, truncate } from "@/lib/utils";
import {
  Bell,
  Mail,
  MessageSquare,
  Smartphone,
  AppWindow,
  Search,
  CheckCheck,
  Loader2,
} from "lucide-react";
import type { NotificationDTO } from "@/components/dashboard/types";

const TYPE_ICON: Record<string, React.ComponentType<{ className?: string }>> = {
  EMAIL: Mail,
  SMS: MessageSquare,
  WHATSAPP: Smartphone,
  IN_APP: AppWindow,
};

const TYPE_LABEL: Record<string, string> = {
  EMAIL: "Email",
  SMS: "SMS",
  WHATSAPP: "WhatsApp",
  IN_APP: "In-app",
};

type StatusFilter = "all" | "QUEUED" | "SENT" | "DELIVERED" | "FAILED" | "RETRIED";
type TypeFilter = "all" | "EMAIL" | "SMS" | "WHATSAPP" | "IN_APP";

export default function NotificationsPage() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [notifications, setNotifications] = useState<NotificationDTO[]>([]);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [typeFilter, setTypeFilter] = useState<TypeFilter>("all");
  const [markingId, setMarkingId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    const res = await apiFetch<{ notifications: NotificationDTO[] }>(
      "/api/notifications"
    );
    setLoading(false);
    if (!res.success || !res.data) {
      setError(res.error?.message ?? "Could not load notifications");
      return;
    }
    setNotifications(res.data.notifications);
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

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return notifications.filter((n) => {
      if (statusFilter !== "all" && n.status !== statusFilter) return false;
      if (typeFilter !== "all" && n.type !== typeFilter) return false;
      if (!q) return true;
      return [n.recipient, n.subject, n.body]
        .join(" ")
        .toLowerCase()
        .includes(q);
    });
  }, [notifications, search, statusFilter, typeFilter]);

  async function markRead(n: NotificationDTO) {
    setMarkingId(n.id);
    const res = await apiFetch(`/api/notifications/${n.id}/read`, {
      method: "POST",
    });
    setMarkingId(null);
    if (!res.success) {
      toast.error("Could not mark as read", { description: res.error?.message });
      return;
    }
    setNotifications((prev) =>
      prev.map((x) =>
        x.id === n.id
          ? {
              ...x,
              status: "DELIVERED",
              deliveredAt: new Date().toISOString(),
            }
          : x
      )
    );
    toast.success("Marked as read");
  }

  async function markAllRead() {
    const queued = filtered.filter(
      (n) => n.status === "QUEUED" || n.status === "SENT"
    );
    if (queued.length === 0) {
      toast.info("Nothing to mark as read");
      return;
    }
    let ok = 0;
    let failed = 0;
    for (const n of queued) {
      const res = await apiFetch(`/api/notifications/${n.id}/read`, {
        method: "POST",
      });
      if (res.success) {
        ok += 1;
        setNotifications((prev) =>
          prev.map((x) =>
            x.id === n.id
              ? {
                  ...x,
                  status: "DELIVERED",
                  deliveredAt: new Date().toISOString(),
                }
              : x
          )
        );
      } else {
        failed += 1;
      }
    }
    if (failed === 0) {
      toast.success(`${ok} notification${ok === 1 ? "" : "s"} marked as read`);
    } else {
      toast.error(`Marked ${ok}, failed ${failed}`);
    }
  }

  const unreadCount = filtered.filter(
    (n) => n.status === "QUEUED" || n.status === "SENT"
  ).length;

  return (
    <div className="flex-1 space-y-6 p-4 sm:p-6 lg:p-8">
      <PageHeader
        eyebrow="Notifications"
        title="Notification log"
        description="A unified trail of every email, SMS, WhatsApp, and in-app message dispatched for your elections."
        actions={
          <Button
            variant="outline"
            onClick={markAllRead}
            disabled={loading || unreadCount === 0}
          >
            <CheckCheck className="h-4 w-4" />
            Mark all read
          </Button>
        }
      />

      {/* Filters */}
      <Card>
        <CardContent className="grid gap-3 p-4 md:grid-cols-[1fr_180px_180px]">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search recipient, subject, body…"
              className="pl-9"
            />
          </div>
          <Select
            value={statusFilter}
            onValueChange={(v) => setStatusFilter(v as StatusFilter)}
          >
            <SelectTrigger className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All statuses</SelectItem>
              <SelectItem value="QUEUED">Queued</SelectItem>
              <SelectItem value="SENT">Sent</SelectItem>
              <SelectItem value="DELIVERED">Delivered</SelectItem>
              <SelectItem value="FAILED">Failed</SelectItem>
              <SelectItem value="RETRIED">Retried</SelectItem>
            </SelectContent>
          </Select>
          <Select
            value={typeFilter}
            onValueChange={(v) => setTypeFilter(v as TypeFilter)}
          >
            <SelectTrigger className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All channels</SelectItem>
              <SelectItem value="EMAIL">Email</SelectItem>
              <SelectItem value="SMS">SMS</SelectItem>
              <SelectItem value="WHATSAPP">WhatsApp</SelectItem>
              <SelectItem value="IN_APP">In-app</SelectItem>
            </SelectContent>
          </Select>
        </CardContent>
      </Card>

      {loading ? (
        <div className="space-y-2">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="h-14 animate-pulse rounded-lg bg-muted" />
          ))}
        </div>
      ) : error ? (
        <ErrorState message={error} onRetry={load} />
      ) : filtered.length === 0 ? (
        <Card>
          <CardContent className="py-2">
            <EmptyState
              title={
                notifications.length === 0
                  ? "No notifications yet"
                  : "No notifications match"
              }
              description={
                notifications.length === 0
                  ? "Notifications (OTP codes, vote receipts, result alerts) will appear here once your elections send them."
                  : "Try adjusting your filters or search query."
              }
              icon={Bell}
              action={
                notifications.length > 0 ? (
                  <Button
                    variant="outline"
                    onClick={() => {
                      setSearch("");
                      setStatusFilter("all");
                      setTypeFilter("all");
                    }}
                  >
                    Reset filters
                  </Button>
                ) : undefined
              }
            />
          </CardContent>
        </Card>
      ) : (
        <Card className="overflow-hidden">
          <ScrollArea className="scroll-area-custom max-h-[65vh]">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="min-w-[140px]">Type</TableHead>
                  <TableHead className="min-w-[200px]">Recipient</TableHead>
                  <TableHead className="min-w-[260px]">Subject / body</TableHead>
                  <TableHead className="hidden min-w-[110px] md:table-cell">
                    Status
                  </TableHead>
                  <TableHead className="hidden min-w-[120px] lg:table-cell">
                    Sent
                  </TableHead>
                  <TableHead className="text-right">Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((n, i) => {
                  const Icon = TYPE_ICON[n.type] ?? Bell;
                  const unread = n.status === "QUEUED" || n.status === "SENT";
                  return (
                    <motion.tr
                      key={n.id}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ duration: 0.2, delay: Math.min(i * 0.02, 0.2) }}
                      className={cn(
                        "border-b last:border-0 hover:bg-accent/40",
                        unread && "bg-primary/[0.03]"
                      )}
                    >
                      <TableCell>
                        <span className="inline-flex items-center gap-2 text-sm font-medium capitalize">
                          <span className="grid size-7 place-items-center rounded-md bg-primary/10 text-primary">
                            <Icon className="h-3.5 w-3.5" />
                          </span>
                          <span className="hidden sm:inline">
                            {TYPE_LABEL[n.type] ?? n.type}
                          </span>
                        </span>
                      </TableCell>
                      <TableCell>
                        <p className="truncate text-sm font-medium">
                          {n.recipient}
                        </p>
                      </TableCell>
                      <TableCell>
                        <p className="truncate text-sm font-medium">
                          {n.subject ?? `(no subject)`}
                        </p>
                        <p className="mt-0.5 truncate text-xs text-muted-foreground">
                          {truncate(n.body, 110)}
                        </p>
                      </TableCell>
                      <TableCell className="hidden md:table-cell">
                        <ColoredBadge
                          value={n.status}
                          tone={NOTIFICATION_STATUS_TONE[n.status] ?? "neutral"}
                        />
                      </TableCell>
                      <TableCell className="hidden lg:table-cell text-xs text-muted-foreground">
                        {n.deliveredAt
                          ? formatRelative(n.deliveredAt)
                          : n.sentAt
                            ? formatRelative(n.sentAt)
                            : formatRelative(n.createdAt)}
                      </TableCell>
                      <TableCell className="text-right">
                        {unread ? (
                          <TooltipProvider delayDuration={200}>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  onClick={() => markRead(n)}
                                  disabled={markingId === n.id}
                                >
                                  {markingId === n.id ? (
                                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                  ) : (
                                    <CheckCheck className="h-3.5 w-3.5" />
                                  )}
                                  <span className="ml-1 hidden sm:inline">
                                    Mark read
                                  </span>
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent side="left" className="text-xs">
                                Mark as read
                              </TooltipContent>
                            </Tooltip>
                          </TooltipProvider>
                        ) : (
                          <span className="text-xs text-muted-foreground">—</span>
                        )}
                      </TableCell>
                    </motion.tr>
                  );
                })}
              </TableBody>
            </Table>
          </ScrollArea>
        </Card>
      )}

      <p className="text-xs text-muted-foreground">
        Showing the last {notifications.length} notifications for your organization.
      </p>
    </div>
  );
}
