"use client";

import { useEffect, useState, useCallback } from "react";
import { motion } from "framer-motion";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
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
import { cn, formatNumber, initials, truncate } from "@/lib/utils";
import {
  Plus,
  Pencil,
  Trash2,
  Loader2,
  Save,
  UserSquare2,
  Vote,
} from "lucide-react";
import type { CandidateDTO, PositionDTO } from "@/components/dashboard/types";
import { CandidatePhotoUploader } from "@/components/dashboard/candidate-photo-uploader";

interface CandidatesResponse {
  candidates: CandidateDTO[];
}
interface PositionsResponse {
  positions: PositionDTO[];
}

export default function CandidatesPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const [electionId, setElectionId] = useState<string | null>(null);
  const [candidates, setCandidates] = useState<CandidateDTO[]>([]);
  const [positions, setPositions] = useState<PositionDTO[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editOpen, setEditOpen] = useState(false);
  const [editing, setEditing] = useState<CandidateDTO | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<CandidateDTO | null>(null);
  const [formName, setFormName] = useState("");
  const [formPositionId, setFormPositionId] = useState("");
  const [formBio, setFormBio] = useState("");
  const [formManifesto, setFormManifesto] = useState("");
  const [formPhoto, setFormPhoto] = useState("");
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
    const [candRes, posRes] = await Promise.all([
      apiFetch<CandidatesResponse>(`/api/elections/${electionId}/candidates`),
      apiFetch<PositionsResponse>(`/api/elections/${electionId}/positions`),
    ]);
    setLoading(false);
    if (candRes.success && candRes.data) {
      setCandidates(candRes.data.candidates);
    } else {
      setError(candRes.error?.message ?? "Could not load candidates");
    }
    if (posRes.success && posRes.data) {
      setPositions(posRes.data.positions);
    }
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
    setFormName("");
    setFormPositionId(positions[0]?.id ?? "");
    setFormBio("");
    setFormManifesto("");
    setFormPhoto("");
    setEditOpen(true);
  }

  function openEdit(c: CandidateDTO) {
    setEditing(c);
    setFormName(c.name);
    setFormPositionId(c.positionId);
    setFormBio(c.bio ?? "");
    setFormManifesto(c.manifesto ?? "");
    setFormPhoto(c.photo ?? "");
    setEditOpen(true);
  }

  async function save() {
    if (!electionId) return;
    if (formName.trim().length < 2) {
      toast.error("Candidate name is too short");
      return;
    }
    if (!formPositionId) {
      toast.error("Select a position for this candidate");
      return;
    }
    setSaving(true);
    const body = {
      name: formName.trim(),
      positionId: formPositionId,
      bio: formBio.trim() || null,
      manifesto: formManifesto.trim() || null,
      photo: formPhoto.trim() || null,
    };
    const res = editing
      ? await apiFetch<{ candidate: CandidateDTO }>(
          `/api/elections/${electionId}/candidates/${editing.id}`,
          { method: "PATCH", body: JSON.stringify(body) }
        )
      : await apiFetch<{ candidate: CandidateDTO }>(
          `/api/elections/${electionId}/candidates`,
          { method: "POST", body: JSON.stringify(body) }
        );
    setSaving(false);
    if (!res.success || !res.data?.candidate) {
      toast.error("Could not save candidate", { description: res.error?.message });
      return;
    }
    toast.success(editing ? "Candidate updated" : "Candidate added");
    setEditOpen(false);
    load();
  }

  async function confirmDelete() {
    if (!electionId || !deleteTarget) return;
    const res = await apiFetch<{ deleted: boolean }>(
      `/api/elections/${electionId}/candidates/${deleteTarget.id}`,
      { method: "DELETE" }
    );
    if (!res.success) {
      toast.error("Could not delete candidate", { description: res.error?.message });
      setDeleteTarget(null);
      return;
    }
    toast.success("Candidate removed");
    setDeleteTarget(null);
    load();
  }

  const positionTitle = (id: string) =>
    positions.find((p) => p.id === id)?.title ?? "—";

  return (
    <ElectionShell electionId={electionId ?? ""} activeTab="candidates">
      <div className="space-y-4">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h2 className="text-lg font-semibold tracking-tight">Candidates</h2>
            <p className="text-sm text-muted-foreground">
              Add candidates and assign each to a position. Voters see these on the ballot.
            </p>
          </div>
          <Button onClick={openCreate} disabled={!electionId || positions.length === 0}>
            <Plus className="h-4 w-4" /> Add candidate
          </Button>
        </div>

        {positions.length === 0 && !loading && (
          <Card>
            <CardContent className="py-2">
              <EmptyState
                title="Add positions first"
                description="Candidates must belong to a position. Head to the Positions tab to create one."
                icon={UserSquare2}
                action={
                  <Button asChild>
                    <a href={`/dashboard/elections/${electionId}/positions`}>
                      Go to Positions
                    </a>
                  </Button>
                }
              />
            </CardContent>
          </Card>
        )}

        {loading ? (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="h-44 animate-pulse rounded-xl bg-muted" />
            ))}
          </div>
        ) : error ? (
          <ErrorState message={error} onRetry={load} />
        ) : candidates.length === 0 ? (
          <Card>
            <CardContent className="py-2">
              <EmptyState
                title="No candidates yet"
                description="Add the people voters will choose between. You can edit bios, manifestos and photos later."
                icon={UserSquare2}
                action={
                  <Button onClick={openCreate}>
                    <Plus className="h-4 w-4" /> Add candidate
                  </Button>
                }
              />
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {candidates.map((c, i) => (
              <motion.div
                key={c.id}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.2, delay: Math.min(i * 0.03, 0.25) }}
              >
                <Card className="group h-full overflow-hidden transition-all hover-lift hover:shadow-md">
                  <CardContent className="flex h-full flex-col gap-3 p-4">
                    <div className="flex items-start gap-3">
                      <Avatar className="h-12 w-12 border">
                        {c.photo ? (
                          <img src={c.photo} alt={c.name} className="h-full w-full rounded-full object-cover" />
                        ) : (
                          <AvatarFallback className="bg-primary/10 text-sm font-semibold text-primary">
                            {initials(c.name)}
                          </AvatarFallback>
                        )}
                      </Avatar>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-semibold">{c.name}</p>
                        <p className="truncate text-xs text-muted-foreground">
                          {c.position?.title ?? positionTitle(c.positionId)}
                        </p>
                      </div>
                      <div className="flex shrink-0 gap-0.5 opacity-100 transition-opacity sm:opacity-0 sm:group-hover:opacity-100">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-9 w-9"
                          onClick={() => openEdit(c)}
                          aria-label={`Edit ${c.name}`}
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-9 w-9 text-destructive hover:bg-destructive/10 hover:text-destructive"
                          onClick={() => setDeleteTarget(c)}
                          aria-label={`Delete ${c.name}`}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>

                    {c.manifesto && (
                      <p className="line-clamp-3 text-xs text-muted-foreground">
                        {truncate(c.manifesto, 180)}
                      </p>
                    )}
                    {!c.manifesto && c.bio && (
                      <p className="line-clamp-3 text-xs text-muted-foreground">
                        {truncate(c.bio, 180)}
                      </p>
                    )}

                    <div className="mt-auto flex items-center justify-between border-t pt-2 text-xs">
                      <Badge variant="outline" className="text-[10px]">
                        {c.position?.title ?? positionTitle(c.positionId)}
                      </Badge>
                      <span
                        className={cn(
                          "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-medium tabular-nums",
                          (c._count?.votes ?? 0) > 0
                            ? "bg-primary/10 text-primary"
                            : "text-muted-foreground"
                        )}
                      >
                        <Vote className="h-3 w-3" />
                        {formatNumber(c._count?.votes ?? 0)} vote{(c._count?.votes ?? 0) === 1 ? "" : "s"}
                      </span>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
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
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>{editing ? "Edit candidate" : "Add candidate"}</DialogTitle>
            <DialogDescription>
              Voter-facing information about this candidate.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4">
            {/* Photo upload from device */}
            <CandidatePhotoUploader
              electionId={electionId}
              candidateId={editing?.id}
              currentPhoto={formPhoto}
              name={formName}
              onPhotoChange={setFormPhoto}
            />
            <div className="grid gap-1.5">
              <Label htmlFor="cand-name">Name *</Label>
              <Input
                id="cand-name"
                value={formName}
                onChange={(e) => setFormName(e.target.value)}
                placeholder="Full name"
                autoFocus
              />
            </div>
            <div className="grid gap-1.5">
              <Label>Position *</Label>
              <Select value={formPositionId} onValueChange={setFormPositionId}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Select a position" />
                </SelectTrigger>
                <SelectContent>
                  {positions.map((p) => (
                    <SelectItem key={p.id} value={p.id}>
                      {p.title}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="cand-bio">Bio</Label>
              <Textarea
                id="cand-bio"
                value={formBio}
                onChange={(e) => setFormBio(e.target.value)}
                rows={2}
                placeholder="Short biographical note"
              />
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="cand-manifesto">Manifesto</Label>
              <Textarea
                id="cand-manifesto"
                value={formManifesto}
                onChange={(e) => setFormManifesto(e.target.value)}
                rows={4}
                placeholder="What this candidate stands for, their promises…"
              />
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
            <Button
              onClick={save}
              disabled={saving || formName.trim().length < 2 || !formPositionId}
            >
              {saving ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" /> Saving…
                </>
              ) : (
                <>
                  <Save className="h-4 w-4" /> {editing ? "Save changes" : "Add candidate"}
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
            <AlertDialogTitle>Delete “{deleteTarget?.name}”?</AlertDialogTitle>
            <AlertDialogDescription>
              This will remove the candidate. Existing votes for this candidate remain in the
              audit log but will be excluded from live results going forward.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDelete}
              className={cn("bg-destructive text-white hover:bg-destructive/90")}
            >
              Delete candidate
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </ElectionShell>
  );
}
