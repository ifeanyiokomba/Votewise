"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { motion } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import {
  ColoredBadge,
  TICKET_PRIORITY_TONE,
  TICKET_STATUS_TONE,
  ROLE_TONE,
} from "@/components/dashboard/colored-badge";
import { ErrorState } from "@/components/dashboard/dashboard-skeleton";
import { apiFetch } from "@/lib/api-fetch";
import { toast } from "sonner";
import { cn, formatRelative, formatDate, initials } from "@/lib/utils";
import {
  ArrowLeft,
  Loader2,
  Send,
  Lock,
  ShieldAlert,
  LifeBuoy,
} from "lucide-react";
import type { UserDTO } from "@/components/dashboard/types";

interface SupportMessageDTO {
  id: string;
  ticketId: string;
  senderId: string;
  body: string;
  isInternal: boolean;
  createdAt: string;
  sender?: { name: string; email: string; role: string } | null;
}

interface SupportTicketDetailDTO {
  id: string;
  subject: string;
  description: string;
  status: string;
  priority: string;
  organizationId: string;
  createdById: string;
  assignedToId: string | null;
  createdAt: string;
  updatedAt: string;
  assignedTo?: { name: string; email: string } | null;
  createdBy?: { name: string; email: string } | null;
  messages?: SupportMessageDTO[];
}

const STATUSES = ["OPEN", "IN_PROGRESS", "WAITING", "RESOLVED", "CLOSED"] as const;

const ADMIN_ROLES = new Set([
  "PLATFORM_ADMIN",
  "ORG_OWNER",
  "ORG_ADMIN",
  "ELECTION_MANAGER",
]);

export default function TicketDetailPage() {
  const params = useParams<{ id: string }>();
  const ticketId = params.id;
  const messagesEndRef = useRef<HTMLDivElement | null>(null);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [ticket, setTicket] = useState<SupportTicketDetailDTO | null>(null);
  const [currentUser, setCurrentUser] = useState<UserDTO | null>(null);
  const [reply, setReply] = useState("");
  const [isInternal, setIsInternal] = useState(false);
  const [sending, setSending] = useState(false);
  const [savingStatus, setSavingStatus] = useState(false);

  const isAdmin = !!currentUser && ADMIN_ROLES.has(currentUser.role);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    const [tRes, meRes] = await Promise.all([
      apiFetch<{ ticket: SupportTicketDetailDTO }>(`/api/support/${ticketId}`),
      apiFetch<{ user: UserDTO | null }>(`/api/auth/me`),
    ]);
    setLoading(false);
    if (!tRes.success || !tRes.data) {
      setError(tRes.error?.message ?? "Could not load ticket");
      return;
    }
    setTicket(tRes.data.ticket);
    if (meRes.success && meRes.data) {
      setCurrentUser(meRes.data.user);
    }
  }, [ticketId]);

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

  // Scroll to newest message on load.
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [ticket?.messages?.length]);

  async function changeStatus(status: string) {
    if (!ticket) return;
    setSavingStatus(true);
    const res = await apiFetch(`/api/support/${ticketId}`, {
      method: "PATCH",
      body: JSON.stringify({ status }),
    });
    setSavingStatus(false);
    if (!res.success) {
      toast.error("Could not update status", { description: res.error?.message });
      return;
    }
    setTicket((prev) => (prev ? { ...prev, status } : prev));
    toast.success(`Status changed to ${status.replace(/_/g, " ").toLowerCase()}`);
  }

  async function sendReply(e: React.FormEvent) {
    e.preventDefault();
    if (!reply.trim()) return;
    setSending(true);
    const res = await apiFetch<{ message: SupportMessageDTO }>(
      `/api/support/${ticketId}/messages`,
      {
        method: "POST",
        body: JSON.stringify({
          body: reply.trim(),
          isInternal: isInternal && isAdmin,
        }),
      }
    );
    setSending(false);
    if (!res.success || !res.data) {
      toast.error("Could not send reply", { description: res.error?.message });
      return;
    }
    setTicket((prev) =>
      prev
        ? {
            ...prev,
            messages: [...(prev.messages ?? []), res.data!.message],
            status: "IN_PROGRESS",
          }
        : prev
    );
    setReply("");
    setIsInternal(false);
    toast.success("Reply sent");
  }

  if (loading) {
    return (
      <div className="flex-1 space-y-6 p-4 sm:p-6 lg:p-8">
        <div className="flex items-center gap-2">
          <Skeleton className="h-9 w-24" />
        </div>
        <Skeleton className="h-24 w-full rounded-xl" />
        <Skeleton className="h-[420px] w-full rounded-xl" />
        <Skeleton className="h-28 w-full rounded-xl" />
      </div>
    );
  }

  if (error || !ticket) {
    return (
      <div className="flex-1 space-y-6 p-4 sm:p-6 lg:p-8">
        <Button asChild variant="ghost" size="sm">
          <Link href="/dashboard/support">
            <ArrowLeft className="h-4 w-4" /> Back to support
          </Link>
        </Button>
        <ErrorState message={error ?? "Ticket not found"} onRetry={load} />
      </div>
    );
  }

  const messages = ticket.messages ?? [];

  return (
    <div className="flex-1 space-y-6 p-4 sm:p-6 lg:p-8">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Button asChild variant="ghost" size="sm">
          <Link href="/dashboard/support">
            <ArrowLeft className="h-4 w-4" /> Back to support
          </Link>
        </Button>
        <div className="flex items-center gap-2">
          <Label htmlFor="status" className="text-xs text-muted-foreground">
            Status
          </Label>
          <Select
            value={ticket.status}
            onValueChange={changeStatus}
            disabled={savingStatus}
          >
            <SelectTrigger id="status" size="sm" className="w-[170px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {STATUSES.map((s) => (
                <SelectItem key={s} value={s}>
                  {s.replace(/_/g, " ").toLowerCase()}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Ticket header */}
      <motion.div
        initial={{ opacity: 0, y: 6 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.25 }}
      >
        <Card>
          <CardHeader>
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="min-w-0 space-y-1">
                <CardTitle className="text-xl">{ticket.subject}</CardTitle>
                <p className="text-sm text-muted-foreground">
                  Opened {formatRelative(ticket.createdAt)} ·{" "}
                  {formatDate(ticket.createdAt)}
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <ColoredBadge
                  value={ticket.status}
                  tone={TICKET_STATUS_TONE[ticket.status] ?? "neutral"}
                />
                <ColoredBadge
                  value={ticket.priority}
                  tone={TICKET_PRIORITY_TONE[ticket.priority] ?? "neutral"}
                />
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <DetailItem label="Created by">
                <div className="flex items-center gap-2">
                  <Avatar className="size-7">
                    <AvatarFallback className="bg-primary/10 text-primary text-xs">
                      {initials(ticket.createdBy?.name ?? "?")}
                    </AvatarFallback>
                  </Avatar>
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium">
                      {ticket.createdBy?.name ?? "—"}
                    </p>
                    <p className="truncate text-xs text-muted-foreground">
                      {ticket.createdBy?.email ?? ""}
                    </p>
                  </div>
                </div>
              </DetailItem>
              <DetailItem label="Assignee">
                {ticket.assignedTo ? (
                  <div className="flex items-center gap-2">
                    <Avatar className="size-7">
                      <AvatarFallback className="bg-muted text-xs">
                        {initials(ticket.assignedTo.name)}
                      </AvatarFallback>
                    </Avatar>
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium">
                        {ticket.assignedTo.name}
                      </p>
                      <p className="truncate text-xs text-muted-foreground">
                        {ticket.assignedTo.email}
                      </p>
                    </div>
                  </div>
                ) : (
                  <span className="text-sm text-muted-foreground">Unassigned</span>
                )}
              </DetailItem>
            </div>
            <Separator />
            <div>
              <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                Description
              </p>
              <p className="mt-2 whitespace-pre-wrap text-sm leading-relaxed">
                {ticket.description}
              </p>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Messages thread */}
      <Card>
        <CardHeader className="border-b pb-4">
          <CardTitle className="flex items-center gap-2 text-base">
            <LifeBuoy className="h-4 w-4 text-primary" />
            Conversation
            <span className="text-xs font-normal text-muted-foreground">
              · {messages.length} {messages.length === 1 ? "message" : "messages"}
            </span>
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {messages.length === 0 ? (
            <div className="flex flex-col items-center justify-center gap-2 px-4 py-12 text-center">
              <p className="text-sm text-muted-foreground">
                No messages yet. Start the conversation below.
              </p>
            </div>
          ) : (
            <ScrollArea className="scroll-area-custom max-h-[55vh]">
              <ol className="space-y-4 p-4 sm:p-6">
                {messages.map((m, i) => {
                  const mine =
                    !!currentUser && m.senderId === currentUser.id;
                  return (
                    <motion.li
                      key={m.id}
                      initial={{ opacity: 0, y: 6 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.2, delay: Math.min(i * 0.02, 0.2) }}
                      className={cn(
                        "flex gap-3",
                        mine ? "flex-row-reverse" : "flex-row"
                      )}
                    >
                      <Avatar className="size-8 shrink-0">
                        <AvatarFallback
                          className={cn(
                            "text-xs",
                            mine
                              ? "bg-primary text-primary-foreground"
                              : "bg-muted"
                          )}
                        >
                          {initials(m.sender?.name ?? "?")}
                        </AvatarFallback>
                      </Avatar>
                      <div
                        className={cn(
                          "max-w-[78%] space-y-1",
                          mine ? "items-end text-right" : "items-start"
                        )}
                      >
                        <div
                          className={cn(
                            "flex items-center gap-2 text-xs text-muted-foreground",
                            mine ? "flex-row-reverse" : "flex-row"
                          )}
                        >
                          <span className="font-medium text-foreground">
                            {mine ? "You" : m.sender?.name ?? "Unknown"}
                          </span>
                          {m.sender?.role && (
                            <ColoredBadge
                              value={m.sender.role}
                              tone={ROLE_TONE[m.sender.role] ?? "neutral"}
                              className="text-[10px]"
                            />
                          )}
                          <span>· {formatRelative(m.createdAt)}</span>
                        </div>
                        <div
                          className={cn(
                            "rounded-xl border px-3.5 py-2.5 text-sm leading-relaxed",
                            m.isInternal
                              ? "border-amber-200 bg-amber-50 dark:border-amber-900 dark:bg-amber-950/30"
                              : mine
                                ? "border-primary/30 bg-primary/10"
                                : "border-border bg-card"
                          )}
                        >
                          {m.isInternal && (
                            <span className="mb-1 flex items-center gap-1 text-[10px] font-semibold uppercase tracking-wide text-amber-700 dark:text-amber-300">
                              <Lock className="h-3 w-3" /> Internal note
                            </span>
                          )}
                          <p className="whitespace-pre-wrap break-words">{m.body}</p>
                        </div>
                      </div>
                    </motion.li>
                  );
                })}
                <div ref={messagesEndRef} />
              </ol>
            </ScrollArea>
          )}
        </CardContent>
      </Card>

      {/* Reply composer */}
      <Card>
        <CardContent className="p-4 sm:p-6">
          <form onSubmit={sendReply} className="space-y-3">
            <Label htmlFor="reply" className="text-sm font-medium">
              Reply
            </Label>
            <Textarea
              id="reply"
              value={reply}
              onChange={(e) => setReply(e.target.value)}
              placeholder="Write a reply…"
              rows={4}
              disabled={sending}
            />
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-start gap-2">
                <Checkbox
                  id="internal"
                  checked={isInternal}
                  onCheckedChange={(v) => setIsInternal(v === true)}
                  disabled={!isAdmin}
                  className="mt-0.5"
                />
                <Label
                  htmlFor="internal"
                  className={cn(
                    "text-xs",
                    !isAdmin && "cursor-not-allowed text-muted-foreground"
                  )}
                >
                  <span className="flex items-center gap-1.5">
                    <Lock className="h-3 w-3" />
                    Mark as internal note
                  </span>
                  <span className="mt-0.5 block text-[11px] font-normal text-muted-foreground">
                    {isAdmin
                      ? "Internal notes are only visible to your team."
                      : "Internal notes are reserved for admins."}
                  </span>
                </Label>
              </div>
              <Button
                type="submit"
                disabled={sending || !reply.trim()}
                className="min-w-[120px]"
              >
                {sending ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" /> Sending…
                  </>
                ) : (
                  <>
                    <Send className="h-4 w-4" /> Send reply
                  </>
                )}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      {!isAdmin && (
        <p className="flex items-center gap-2 text-xs text-muted-foreground">
          <ShieldAlert className="h-3.5 w-3.5" />
          Only admins can mark messages as internal notes.
        </p>
      )}
    </div>
  );
}

function DetailItem({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-1">
      <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
        {label}
      </p>
      <div>{children}</div>
    </div>
  );
}
