"use client";

import { useEffect, useState, useCallback, useMemo } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { ScrollArea } from "@/components/ui/scroll-area";
import { PageHeader } from "@/components/dashboard/page-header";
import {
  ColoredBadge,
  TICKET_PRIORITY_TONE,
  TICKET_STATUS_TONE,
} from "@/components/dashboard/colored-badge";
import {
  EmptyState,
  ErrorState,
} from "@/components/dashboard/dashboard-skeleton";
import { apiFetch } from "@/lib/api-fetch";
import { toast } from "sonner";
import { cn, formatRelative } from "@/lib/utils";
import {
  LifeBuoy,
  Plus,
  Loader2,
  MessageSquare,
  ArrowRight,
} from "lucide-react";

interface SupportTicketDTO {
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
  _count?: { messages: number };
  assignedTo?: { name: string } | null;
  createdBy?: { name: string; email: string } | null;
}

type Filter = "all" | "OPEN" | "IN_PROGRESS" | "WAITING" | "RESOLVED" | "CLOSED";

const FILTERS: { value: Filter; label: string }[] = [
  { value: "all", label: "All" },
  { value: "OPEN", label: "Open" },
  { value: "IN_PROGRESS", label: "In progress" },
  { value: "WAITING", label: "Waiting" },
  { value: "RESOLVED", label: "Resolved" },
  { value: "CLOSED", label: "Closed" },
];

export default function SupportPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [tickets, setTickets] = useState<SupportTicketDTO[]>([]);
  const [filter, setFilter] = useState<Filter>("all");
  const [createOpen, setCreateOpen] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    const res = await apiFetch<{ tickets: SupportTicketDTO[] }>("/api/support");
    setLoading(false);
    if (!res.success || !res.data) {
      setError(res.error?.message ?? "Could not load support tickets");
      return;
    }
    setTickets(res.data.tickets);
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

  const counts = useMemo(() => {
    const c: Record<Filter, number> = {
      all: tickets.length,
      OPEN: 0,
      IN_PROGRESS: 0,
      WAITING: 0,
      RESOLVED: 0,
      CLOSED: 0,
    };
    for (const t of tickets) {
      if (t.status in c) c[t.status as Filter] += 1;
    }
    return c;
  }, [tickets]);

  const filtered = useMemo(
    () =>
      filter === "all" ? tickets : tickets.filter((t) => t.status === filter),
    [tickets, filter]
  );

  return (
    <div className="flex-1 space-y-6 p-4 sm:p-6 lg:p-8">
      <PageHeader
        eyebrow="Support"
        title="Support inbox"
        description="Open tickets, track conversations, and resolve issues for your team."
        actions={
          <Button onClick={() => setCreateOpen(true)}>
            <Plus className="h-4 w-4" />
            New ticket
          </Button>
        }
      />

      {/* Filter tabs */}
      <div className="flex flex-wrap gap-1 rounded-xl border bg-card p-1 shadow-sm">
        {FILTERS.map((f) => (
          <button
            key={f.value}
            onClick={() => setFilter(f.value)}
            className={cn(
              "flex items-center gap-2 rounded-lg px-3 py-1.5 text-xs font-medium transition-colors sm:text-sm",
              filter === f.value
                ? "bg-primary text-primary-foreground shadow-sm"
                : "text-muted-foreground hover:bg-accent hover:text-foreground"
            )}
          >
            {f.label}
            <span
              className={cn(
                "rounded-full px-1.5 py-0.5 text-[10px] tabular-nums",
                filter === f.value
                  ? "bg-primary-foreground/20 text-primary-foreground"
                  : "bg-muted text-muted-foreground"
              )}
            >
              {counts[f.value]}
            </span>
          </button>
        ))}
      </div>

      {loading ? (
        <div className="space-y-2">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="h-14 animate-pulse rounded-lg bg-muted" />
          ))}
        </div>
      ) : error ? (
        <ErrorState message={error} onRetry={load} />
      ) : filtered.length === 0 ? (
        <Card>
          <CardContent className="py-2">
            <EmptyState
              title={filter === "all" ? "No tickets yet" : "No tickets in this state"}
              description={
                filter === "all"
                  ? "Need help? Open a support ticket and our team will respond."
                  : "Try another filter or open a new ticket."
              }
              icon={LifeBuoy}
              action={
                <Button onClick={() => setCreateOpen(true)}>
                  <Plus className="h-4 w-4" /> New ticket
                </Button>
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
                  <TableHead className="min-w-[260px]">Subject</TableHead>
                  <TableHead className="min-w-[110px]">Status</TableHead>
                  <TableHead className="min-w-[100px]">Priority</TableHead>
                  <TableHead className="hidden min-w-[140px] md:table-cell">
                    Assignee
                  </TableHead>
                  <TableHead className="hidden min-w-[100px] sm:table-cell text-right">
                    Messages
                  </TableHead>
                  <TableHead className="hidden min-w-[120px] lg:table-cell">
                    Updated
                  </TableHead>
                  <TableHead className="w-10" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((t, i) => (
                  <motion.tr
                    key={t.id}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ duration: 0.2, delay: Math.min(i * 0.02, 0.2) }}
                    onClick={() => router.push(`/dashboard/support/${t.id}`)}
                    className="cursor-pointer border-b transition-colors hover:bg-accent/60 last:border-0"
                  >
                    <TableCell className="font-medium">
                      <div className="truncate">{t.subject}</div>
                      <div className="mt-0.5 text-xs text-muted-foreground truncate">
                        {t.createdBy?.name ?? "—"}
                      </div>
                    </TableCell>
                    <TableCell>
                      <ColoredBadge
                        value={t.status}
                        tone={TICKET_STATUS_TONE[t.status] ?? "neutral"}
                      />
                    </TableCell>
                    <TableCell>
                      <ColoredBadge
                        value={t.priority}
                        tone={TICKET_PRIORITY_TONE[t.priority] ?? "neutral"}
                      />
                    </TableCell>
                    <TableCell className="hidden md:table-cell">
                      {t.assignedTo?.name ?? (
                        <span className="text-xs text-muted-foreground">Unassigned</span>
                      )}
                    </TableCell>
                    <TableCell className="hidden sm:table-cell text-right">
                      <span className="inline-flex items-center gap-1.5 text-xs text-muted-foreground">
                        <MessageSquare className="h-3.5 w-3.5" />
                        {t._count?.messages ?? 0}
                      </span>
                    </TableCell>
                    <TableCell className="hidden lg:table-cell text-xs text-muted-foreground">
                      {formatRelative(t.updatedAt)}
                    </TableCell>
                    <TableCell>
                      <ArrowRight className="h-4 w-4 text-muted-foreground" />
                    </TableCell>
                  </motion.tr>
                ))}
              </TableBody>
            </Table>
          </ScrollArea>
        </Card>
      )}

      <NewTicketDialog
        open={createOpen}
        onOpenChange={setCreateOpen}
        onCreated={() => {
          setCreateOpen(false);
          toast.success("Ticket created");
          load();
        }}
      />
    </div>
  );
}

function NewTicketDialog({
  open,
  onOpenChange,
  onCreated,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onCreated: () => void;
}) {
  const [subject, setSubject] = useState("");
  const [description, setDescription] = useState("");
  const [priority, setPriority] = useState("MEDIUM");
  const [saving, setSaving] = useState(false);

  function reset() {
    setSubject("");
    setDescription("");
    setPriority("MEDIUM");
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!subject.trim() || !description.trim()) {
      toast.error("Subject and description are required");
      return;
    }
    setSaving(true);
    const res = await apiFetch<{ ticket: SupportTicketDTO }>("/api/support", {
      method: "POST",
      body: JSON.stringify({
        subject: subject.trim(),
        description: description.trim(),
        priority,
      }),
    });
    setSaving(false);
    if (!res.success) {
      toast.error("Could not create ticket", { description: res.error?.message });
      return;
    }
    reset();
    onCreated();
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Open a support ticket</DialogTitle>
          <DialogDescription>
            Tell us what you need. Our team typically responds within one business day.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={onSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="subject">Subject</Label>
            <Input
              id="subject"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              placeholder="Briefly describe the issue"
              maxLength={140}
              required
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="priority">Priority</Label>
            <Select value={priority} onValueChange={setPriority}>
              <SelectTrigger id="priority" className="w-full">
                <SelectValue placeholder="Select priority" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="LOW">Low</SelectItem>
                <SelectItem value="MEDIUM">Medium</SelectItem>
                <SelectItem value="HIGH">High</SelectItem>
                <SelectItem value="URGENT">Urgent</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Add details, steps to reproduce, election IDs, etc."
              rows={5}
              required
            />
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={saving}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={saving}>
              {saving ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" /> Submitting…
                </>
              ) : (
                "Open ticket"
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
