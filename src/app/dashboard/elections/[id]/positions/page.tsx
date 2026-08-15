"use client";

import { useEffect, useState, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ElectionShell } from "@/components/dashboard/election-shell";
import { EmptyState, ErrorState } from "@/components/dashboard/dashboard-skeleton";
import { apiFetch } from "@/lib/api-fetch";
import { toast } from "sonner";
import {
  Plus,
  Pencil,
  Trash2,
  Loader2,
  GripVertical,
  Users,
  Vote,
  Save,
  Layers,
} from "lucide-react";
import type { PositionDTO } from "@/components/dashboard/types";

interface PositionsResponse {
  positions: PositionDTO[];
}

export default function PositionsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const [electionId, setElectionId] = useState<string | null>(null);
  const [positions, setPositions] = useState<PositionDTO[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editOpen, setEditOpen] = useState(false);
  const [editing, setEditing] = useState<PositionDTO | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<PositionDTO | null>(null);
  const [formTitle, setFormTitle] = useState("");
  const [formDescription, setFormDescription] = useState("");
  const [formMaxChoices, setFormMaxChoices] = useState("1");
  const [saving, setSaving] = useState(false);

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
    const res = await apiFetch<PositionsResponse>(
      `/api/elections/${electionId}/positions`
    );
    setLoading(false);
    if (!res.success || !res.data) {
      setError(res.error?.message ?? "Could not load positions");
      return;
    }
    setPositions(res.data.positions);
  }, [electionId]);

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

  function openCreate() {
    setEditing(null);
    setFormTitle("");
    setFormDescription("");
    setFormMaxChoices("1");
    setEditOpen(true);
  }

  function openEdit(p: PositionDTO) {
    setEditing(p);
    setFormTitle(p.title);
    setFormDescription(p.description ?? "");
    setFormMaxChoices(String(p.maxChoices));
    setEditOpen(true);
  }

  async function save() {
    if (!electionId) return;
    if (formTitle.trim().length < 2) {
      toast.error("Title is too short");
      return;
    }
    setSaving(true);
    const body = {
      title: formTitle.trim(),
      description: formDescription.trim() || null,
      maxChoices: Number(formMaxChoices),
    };
    const res = editing
      ? await apiFetch<{ position: PositionDTO }>(
          `/api/elections/${electionId}/positions/${editing.id}`,
          { method: "PATCH", body: JSON.stringify(body) }
        )
      : await apiFetch<{ position: PositionDTO }>(
          `/api/elections/${electionId}/positions`,
          { method: "POST", body: JSON.stringify(body) }
        );
    setSaving(false);
    if (!res.success || !res.data?.position) {
      toast.error("Could not save position", { description: res.error?.message });
      return;
    }
    toast.success(editing ? "Position updated" : "Position added");
    setEditOpen(false);
    load();
  }

  async function confirmDelete() {
    if (!electionId || !deleteTarget) return;
    const res = await apiFetch<{ deleted: boolean }>(
      `/api/elections/${electionId}/positions/${deleteTarget.id}`,
      { method: "DELETE" }
    );
    if (!res.success) {
      toast.error("Could not delete position", { description: res.error?.message });
      setDeleteTarget(null);
      return;
    }
    toast.success("Position removed");
    setDeleteTarget(null);
    load();
  }

  return (
    <ElectionShell electionId={electionId ?? ""} activeTab="positions">
      <div className="space-y-4">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h2 className="text-lg font-semibold tracking-tight">Positions</h2>
            <p className="text-sm text-muted-foreground">
              The contests voters will decide on. Drag is not required — positions show in their set order.
            </p>
          </div>
          <Button onClick={openCreate} disabled={!electionId}>
            <Plus className="h-4 w-4" /> Add position
          </Button>
        </div>

        {loading ? (
          <div className="space-y-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="h-20 animate-pulse rounded-xl bg-muted" />
            ))}
          </div>
        ) : error ? (
          <ErrorState message={error} onRetry={load} />
        ) : positions.length === 0 ? (
          <Card>
            <CardContent className="py-2">
              <EmptyState
                title="No positions yet"
                description="Add a position (e.g. President, Secretary) so voters can pick a candidate for it."
                icon={Layers}
                action={
                  <Button onClick={openCreate}>
                    <Plus className="h-4 w-4" /> Add position
                  </Button>
                }
              />
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-3">
            {positions.map((p, i) => (
              <Card key={p.id} className="overflow-hidden transition-all hover-lift hover:shadow-md">
                <CardContent className="flex items-center gap-3 p-4">
                  <div className="grid h-10 w-10 shrink-0 place-items-center rounded-lg bg-primary/10 text-primary">
                    <GripVertical className="h-4 w-4" />
                  </div>
                  <div className="flex w-7 shrink-0 items-center justify-center text-xs font-semibold text-muted-foreground tabular-nums">
                    #{i + 1}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="truncate text-sm font-semibold">{p.title}</h3>
                      <Badge variant="outline" className="border-primary/30 bg-primary/5 text-[10px] text-primary">
                        max {p.maxChoices} {p.maxChoices === 1 ? "vote" : "votes"}
                      </Badge>
                    </div>
                    {p.description && (
                      <p className="mt-0.5 line-clamp-1 text-xs text-muted-foreground">
                        {p.description}
                      </p>
                    )}
                  </div>
                  <div className="flex shrink-0 items-center gap-2">
                    <span
                      className={`hidden items-center gap-1 rounded-md px-2 py-1 text-xs sm:inline-flex ${
                        (p._count?.candidates ?? 0) > 0
                          ? "bg-primary/10 text-primary"
                          : "bg-muted/40 text-muted-foreground"
                      }`}
                    >
                      <Users className="h-3 w-3" />
                      <span className="font-semibold tabular-nums">
                        {p._count?.candidates ?? 0}
                      </span>
                      <span className="opacity-70">cands</span>
                    </span>
                    <span
                      className={`hidden items-center gap-1 rounded-md px-2 py-1 text-xs sm:inline-flex ${
                        (p._count?.votes ?? 0) > 0
                          ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                          : "bg-muted/40 text-muted-foreground"
                      }`}
                    >
                      <Vote className="h-3 w-3" />
                      <span className="font-semibold tabular-nums">
                        {p._count?.votes ?? 0}
                      </span>
                      <span className="opacity-70">votes</span>
                    </span>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8"
                      onClick={() => openEdit(p)}
                      aria-label={`Edit ${p.title}`}
                    >
                      <Pencil className="h-3.5 w-3.5" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-destructive hover:bg-destructive/10 hover:text-destructive"
                      onClick={() => setDeleteTarget(p)}
                      aria-label={`Delete ${p.title}`}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      <Dialog
        open={editOpen}
        onOpenChange={(v) => {
          setEditOpen(v);
          if (!v) setEditing(null);
        }}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{editing ? "Edit position" : "Add position"}</DialogTitle>
            <DialogDescription>
              Define the contest voters will see on their ballot.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4">
            <div className="grid gap-1.5">
              <Label htmlFor="pos-title">Title *</Label>
              <Input
                id="pos-title"
                value={formTitle}
                onChange={(e) => setFormTitle(e.target.value)}
                placeholder="e.g. President"
                autoFocus
              />
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="pos-desc">Description</Label>
              <Textarea
                id="pos-desc"
                value={formDescription}
                onChange={(e) => setFormDescription(e.target.value)}
                rows={3}
                placeholder="What does this role involve?"
              />
            </div>
            <div className="grid gap-1.5">
              <Label>Max choices</Label>
              <Select value={formMaxChoices} onValueChange={setFormMaxChoices}>
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {[1, 2, 3, 4, 5].map((n) => (
                    <SelectItem key={n} value={String(n)}>
                      {n} {n === 1 ? "candidate" : "candidates"}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                How many candidates a voter may select for this position.
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setEditOpen(false)}
              disabled={saving}
            >
              Cancel
            </Button>
            <Button onClick={save} disabled={saving || formTitle.trim().length < 2}>
              {saving ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" /> Saving…
                </>
              ) : (
                <>
                  <Save className="h-4 w-4" /> {editing ? "Save changes" : "Add position"}
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog
        open={!!deleteTarget}
        onOpenChange={(o) => !o && setDeleteTarget(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete “{deleteTarget?.title}”?</AlertDialogTitle>
            <AlertDialogDescription>
              This will remove the position and any candidate associations. Existing votes
              are preserved for audit purposes but won&apos;t appear in live results.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDelete}
              className="bg-destructive text-white hover:bg-destructive/90"
            >
              Delete position
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </ElectionShell>
  );
}
