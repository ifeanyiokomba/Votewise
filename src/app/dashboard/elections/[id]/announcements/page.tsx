"use client";

import { useEffect, useState, useCallback } from "react";
import { motion } from "framer-motion";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { ElectionShell } from "@/components/dashboard/election-shell";
import { ErrorState } from "@/components/dashboard/dashboard-skeleton";
import { apiFetch } from "@/lib/api-fetch";
import { toast } from "sonner";
import { cn, formatRelative } from "@/lib/utils";
import {
  Megaphone,
  Plus,
  Loader2,
  Trash2,
  Send,
  Info,
  AlertTriangle,
  CheckCircle2,
  AlertOctagon,
  Bell,
} from "lucide-react";

interface Announcement {
  id: string;
  subject: string | null;
  body: string;
  type: string | null;
  status: string;
  isActive: boolean;
  createdAt: string;
  metadata?: string | null;
}

interface AnnouncementListResponse {
  announcements: Announcement[];
}

const ANNOUNCEMENT_TYPES = [
  { value: "info", label: "Info", icon: Info, tone: "border-blue-300 bg-blue-50 text-blue-700 dark:border-blue-800 dark:bg-blue-950/40 dark:text-blue-300" },
  { value: "warning", label: "Warning", icon: AlertTriangle, tone: "border-amber-300 bg-amber-50 text-amber-700 dark:border-amber-800 dark:bg-amber-950/40 dark:text-amber-300" },
  { value: "success", label: "Success", icon: CheckCircle2, tone: "border-emerald-300 bg-emerald-50 text-emerald-700 dark:border-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300" },
  { value: "urgent", label: "Urgent", icon: AlertOctagon, tone: "border-red-300 bg-red-50 text-red-700 dark:border-red-800 dark:bg-red-950/40 dark:text-red-300" },
];

export default function AnnouncementsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const [electionId, setElectionId] = useState<string | null>(null);
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Composer state
  const [title, setTitle] = useState("");
  const [message, setMessage] = useState("");
  const [type, setType] = useState<string>("info");
  const [isActive, setIsActive] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<Announcement | null>(null);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    (async () => {
      const { id } = await params;
      setElectionId(id);
    })();
  }, [params]);

  const load = useCallback(async () => {
    if (!electionId) return;
    setLoading(true);
    setError(null);
    const res = await apiFetch<AnnouncementListResponse>(
      `/api/elections/${electionId}/announcements`
    );
    setLoading(false);
    if (!res.success || !res.data) {
      setError(res.error?.message ?? "Could not load announcements");
      return;
    }
    const cleaned = (res.data.announcements ?? []).map((a) => {
      try {
        const meta = JSON.parse(a.metadata ?? "{}");
        return { ...a, type: meta.announcementType ?? "info", isActive: !!meta.isActive };
      } catch {
        return { ...a, type: "info", isActive: true };
      }
    });
    setAnnouncements(cleaned);
  }, [electionId]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (cancelled) return;
      await load();
    })();
    return () => { cancelled = false; };
  }, [load]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!electionId) return;
    if (title.trim().length < 2) {
      toast.error("Title is too short");
      return;
    }
    if (message.trim().length < 5) {
      toast.error("Message is too short");
      return;
    }
    setSaving(true);
    const res = await apiFetch<{ announcement: unknown }>(
      `/api/elections/${electionId}/announcements`,
      {
        method: "POST",
        body: JSON.stringify({
          title: title.trim(),
          message: message.trim(),
          type,
          isActive,
        }),
      }
    );
    setSaving(false);
    if (!res.success) {
      toast.error("Could not send announcement", { description: res.error?.message });
      return;
    }
    toast.success("Announcement sent", {
      description: isActive
        ? "Now visible to voters on the voting page."
        : "Saved as draft (not visible to voters).",
    });
    setTitle("");
    setMessage("");
    setType("info");
    setIsActive(true);
    load();
  }

  async function confirmDelete() {
    if (!electionId || !deleteTarget) return;
    setDeleting(true);
    const res = await apiFetch(
      `/api/elections/${electionId}/announcements?notifId=${deleteTarget.id}`,
      { method: "DELETE" }
    );
    setDeleting(false);
    setDeleteTarget(null);
    if (!res.success) {
      toast.error("Could not delete announcement", { description: res.error?.message });
      return;
    }
    toast.success("Announcement deleted");
    load();
  }

  return (
    <ElectionShell electionId={electionId ?? ""} activeTab="announcements">
      <div className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="flex items-center gap-2 text-lg font-semibold tracking-tight">
              <Megaphone className="h-4 w-4 text-primary" />
              Announcements
            </h2>
            <p className="text-sm text-muted-foreground">
              Type and broadcast announcements visible to voters on the voting page in real time.
            </p>
          </div>
          <Badge variant="outline" className="text-xs">
            <Bell className="h-3 w-3" /> {announcements.filter(a => a.isActive).length} active
          </Badge>
        </div>

        {/* Composer */}
        <Card className="border-primary/30 bg-primary/[0.02]">
          <CardHeader className="border-b pb-4">
            <CardTitle className="flex items-center gap-2 text-base">
              <Plus className="h-4 w-4 text-primary" />
              New announcement
            </CardTitle>
            <CardDescription className="text-xs">
              Visible instantly to voters on the election voting page. Use urgent sparingly —
              urgent announcements appear as a red banner.
            </CardDescription>
          </CardHeader>
          <CardContent className="pt-4">
            <form onSubmit={submit} className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-[1fr_200px]">
                <div className="space-y-1.5">
                  <Label htmlFor="ann-title">Title</Label>
                  <Input
                    id="ann-title"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="e.g. Voting extended by 30 minutes"
                    maxLength={200}
                    required
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>Type</Label>
                  <Select value={type} onValueChange={setType}>
                    <SelectTrigger className="w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {ANNOUNCEMENT_TYPES.map((t) => (
                        <SelectItem key={t.value} value={t.value}>
                          <span className="flex items-center gap-1.5">
                            <t.icon className="h-3 w-3" /> {t.label}
                          </span>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="ann-message">Message</Label>
                <Textarea
                  id="ann-message"
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  rows={4}
                  placeholder="Write your announcement to voters…"
                  maxLength={2000}
                  required
                />
                <p className="text-[11px] text-muted-foreground">
                  {message.length}/2000 characters
                </p>
              </div>

              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <Switch
                    checked={isActive}
                    onCheckedChange={setIsActive}
                    id="ann-active"
                  />
                  <Label htmlFor="ann-active" className="text-sm">
                    Publish immediately (visible to voters)
                  </Label>
                </div>
                <Button type="submit" disabled={saving}>
                  {saving ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" /> Sending…
                    </>
                  ) : (
                    <>
                      <Send className="h-4 w-4" /> Send announcement
                    </>
                  )}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>

        {/* List */}
        {loading ? (
          <div className="space-y-2">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="h-20 animate-pulse rounded-lg bg-muted" />
            ))}
          </div>
        ) : error ? (
          <ErrorState message={error} onRetry={load} />
        ) : announcements.length === 0 ? (
          <Card>
            <CardContent className="py-2">
              <div className="flex flex-col items-center gap-3 py-10 text-center">
                <div className="grid size-12 place-items-center rounded-full bg-muted">
                  <Megaphone className="size-6 text-muted-foreground" />
                </div>
                <div>
                  <p className="text-sm font-medium">No announcements yet</p>
                  <p className="text-xs text-muted-foreground">
                    Use the form above to broadcast your first announcement to voters.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        ) : (
          <Card>
            <CardHeader className="border-b pb-3">
              <CardTitle className="text-sm">Recent announcements</CardTitle>
              <CardDescription className="text-xs">
                Most recent first · {announcements.length} total
              </CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              <ScrollArea className="max-h-[28rem] scroll-area-custom">
                <div className="space-y-2 p-3">
                  {announcements.map((a, idx) => {
                    const typeMeta = ANNOUNCEMENT_TYPES.find(t => t.value === a.type) ?? ANNOUNCEMENT_TYPES[0];
                    const Icon = typeMeta.icon;
                    return (
                      <motion.div
                        key={a.id}
                        initial={{ opacity: 0, y: 4 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: Math.min(idx * 0.03, 0.2) }}
                        className={cn(
                          "rounded-lg border p-3 transition-colors hover:bg-accent/30",
                          a.isActive ? "bg-card" : "bg-muted/20 opacity-60"
                        )}
                      >
                        <div className="flex items-start gap-3">
                          <div className={cn("grid size-9 shrink-0 place-items-center rounded-lg", typeMeta.tone)}>
                            <Icon className="size-4" />
                          </div>
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center justify-between gap-2">
                              <p className="truncate text-sm font-semibold">{a.subject ?? "Untitled"}</p>
                              <div className="flex shrink-0 items-center gap-1.5">
                                {a.isActive ? (
                                  <Badge variant="outline" className="border-emerald-300 bg-emerald-50 text-emerald-700 text-[9px] dark:border-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300">
                                    Active
                                  </Badge>
                                ) : (
                                  <Badge variant="outline" className="text-[9px] text-muted-foreground">
                                    Draft
                                  </Badge>
                                )}
                                <Badge variant="outline" className={cn("text-[9px]", typeMeta.tone)}>
                                  {typeMeta.label}
                                </Badge>
                              </div>
                            </div>
                            <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">
                              {a.body}
                            </p>
                            <div className="mt-2 flex items-center justify-between gap-2">
                              <span className="text-[10px] text-muted-foreground">
                                {formatRelative(a.createdAt)}
                              </span>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-9 px-3 text-xs text-destructive hover:bg-destructive/10 hover:text-destructive"
                                onClick={() => setDeleteTarget(a)}
                              >
                                <Trash2 className="h-3.5 w-3.5" /> Delete
                              </Button>
                            </div>
                          </div>
                        </div>
                      </motion.div>
                    );
                  })}
                </div>
              </ScrollArea>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Delete confirmation */}
      <AlertDialog open={!!deleteTarget} onOpenChange={(o) => { if (!o) setDeleteTarget(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete announcement?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently remove the announcement
              {deleteTarget?.subject ? ` "${deleteTarget.subject}"` : ""} from the voter pages.
              This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => { e.preventDefault(); confirmDelete(); }}
              disabled={deleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleting ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" /> Deleting…
                </>
              ) : (
                <>
                  <Trash2 className="h-4 w-4" /> Delete
                </>
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </ElectionShell>
  );
}
