"use client";

import { useEffect, useState, useCallback } from "react";
import { motion } from "framer-motion";
import { ElectionShell } from "@/components/dashboard/election-shell";
import { EmptyState, ErrorState } from "@/components/dashboard/dashboard-skeleton";
import { apiFetch } from "@/lib/api-fetch";
import { toast } from "sonner";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
  Eye,
  UserPlus,
  Trash2,
  Mail,
  ShieldCheck,
  Clock,
  Loader2,
  Users,
  CheckCircle2,
} from "lucide-react";
import { initials, formatRelative } from "@/lib/utils";

interface ObserverUser {
  id: string;
  name: string;
  email: string;
  role: string;
  isActive: boolean;
  lastLoginAt: string | null;
}

interface ObserverItem {
  id: string;
  userId: string;
  electionId: string;
  createdAt: string;
  user: ObserverUser;
}

export default function ObserversPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const [electionId, setElectionId] = useState<string | null>(null);
  const [observers, setObservers] = useState<ObserverItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [addOpen, setAddOpen] = useState(false);
  const [removeTarget, setRemoveTarget] = useState<ObserverItem | null>(null);
  const [removing, setRemoving] = useState(false);

  // Add form state
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [adding, setAdding] = useState(false);

  useEffect(() => {
    (async () => {
      const { id } = await params;
      setElectionId(id);
    })();
  }, [params]);

  const load = useCallback(async () => {
    if (!electionId) return;
    const res = await apiFetch<{ observers: ObserverItem[] }>(
      `/api/elections/${electionId}/observers`
    );
    if (res.success && res.data) {
      setObservers(res.data.observers);
      setError(null);
    } else {
      setError(res.error?.message ?? "Could not load observers");
    }
    setLoading(false);
  }, [electionId]);

  useEffect(() => {
    if (!electionId) return;
    let cancelled = false;
    (async () => {
      if (cancelled) return;
      await load();
    })();
    return () => {
      cancelled = true;
    };
  }, [electionId, load]);

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    if (!electionId || !name.trim() || !email.trim()) return;
    setAdding(true);
    const res = await apiFetch<{ observer: ObserverItem }>(
      `/api/elections/${electionId}/observers`,
      {
        method: "POST",
        body: JSON.stringify({ name: name.trim(), email: email.trim() }),
      }
    );
    setAdding(false);
    if (!res.success || !res.data?.observer) {
      toast.error("Could not add observer", { description: res.error?.message });
      return;
    }
    toast.success("Observer added", {
      description: `${res.data.observer.user.name} can now monitor this election.`,
    });
    setName("");
    setEmail("");
    setAddOpen(false);
    load();
  }

  async function handleRemove() {
    if (!electionId || !removeTarget) return;
    setRemoving(true);
    const res = await apiFetch(
      `/api/elections/${electionId}/observers/${removeTarget.id}`,
      { method: "DELETE" }
    );
    setRemoving(false);
    if (!res.success) {
      toast.error("Could not remove observer", { description: res.error?.message });
      setRemoveTarget(null);
      return;
    }
    toast.success("Observer removed", {
      description: `${removeTarget.user.name} no longer has access.`,
    });
    setRemoveTarget(null);
    load();
  }

  return (
    <ElectionShell electionId={electionId ?? ""} activeTab="observers">
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="flex items-center gap-2 text-lg font-semibold tracking-tight">
              <Eye className="h-5 w-5 text-primary" />
              Observers
            </h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Grant monitored access to auditors and stakeholders. Observers can view
              election health and turnout — never voter identities or ballot choices.
            </p>
          </div>
          <Button onClick={() => setAddOpen(true)}>
            <UserPlus className="h-4 w-4" />
            Add observer
          </Button>
        </div>

        {/* Observer list */}
        {loading ? (
          <div className="space-y-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="h-20 animate-pulse rounded-xl bg-muted" />
            ))}
          </div>
        ) : error ? (
          <ErrorState message={error} onRetry={load} />
        ) : observers.length === 0 ? (
          <Card>
            <CardContent className="py-2">
              <EmptyState
                title="No observers assigned"
                description="Add observers so auditors or stakeholders can monitor this election's progress and turnout without accessing voter data."
                icon={Eye}
                action={
                  <Button onClick={() => setAddOpen(true)} className="mt-2">
                    <UserPlus className="h-4 w-4" />
                    Add first observer
                  </Button>
                }
              />
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-3">
            {/* Summary bar */}
            <div className="flex items-center gap-4 rounded-xl border bg-muted/30 p-4">
              <div className="flex items-center gap-2">
                <div className="grid h-9 w-9 place-items-center rounded-lg bg-primary/10 text-primary">
                  <Users className="h-4 w-4" />
                </div>
                <div>
                  <p className="text-2xl font-bold tabular-nums">{observers.length}</p>
                  <p className="text-xs text-muted-foreground">
                    Observer{observers.length === 1 ? "" : "s"} assigned
                  </p>
                </div>
              </div>
              <div className="ml-auto flex items-center gap-2">
                <Badge variant="outline" className="gap-1.5 border-emerald-300 text-emerald-700 dark:border-emerald-700 dark:text-emerald-300">
                  <ShieldCheck className="h-3 w-3" />
                  Read-only access
                </Badge>
              </div>
            </div>

            {observers.map((obs, idx) => (
              <motion.div
                key={obs.id}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: Math.min(idx * 0.05, 0.3) }}
              >
                <Card className="hover-lift group transition-shadow hover:shadow-md">
                  <CardContent className="flex items-center gap-4 p-4">
                    <Avatar className="h-11 w-11 border">
                      <AvatarFallback className="bg-primary/10 text-sm font-semibold text-primary">
                        {initials(obs.user.name)}
                      </AvatarFallback>
                    </Avatar>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <p className="truncate font-medium">{obs.user.name}</p>
                        {obs.user.isActive ? (
                          <Badge variant="outline" className="border-emerald-300 bg-emerald-50 px-1.5 py-0 text-[10px] text-emerald-700 dark:border-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300">
                            active
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="border-muted-foreground/30 px-1.5 py-0 text-[10px] text-muted-foreground">
                            disabled
                          </Badge>
                        )}
                      </div>
                      <div className="mt-0.5 flex items-center gap-3 text-xs text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <Mail className="h-3 w-3" />
                          {obs.user.email}
                        </span>
                        {obs.user.lastLoginAt && (
                          <span className="flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            last seen {formatRelative(obs.user.lastLoginAt)}
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className="hidden gap-1.5 sm:flex">
                        <Eye className="h-3 w-3" />
                        View turnout & results
                      </Badge>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-muted-foreground opacity-0 transition-opacity hover:text-destructive group-hover:opacity-100"
                        onClick={() => setRemoveTarget(obs)}
                        aria-label={`Remove ${obs.user.name}`}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>
        )}
      </div>

      {/* Add observer dialog */}
      <Dialog open={addOpen} onOpenChange={setAddOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <UserPlus className="h-5 w-5 text-primary" />
              Add observer
            </DialogTitle>
            <DialogDescription>
              Grant monitored, read-only access to this election. Observers see
              turnout, verification rates and results — never individual voter data.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleAdd} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Full name</Label>
              <Input
                id="name"
                placeholder="e.g. Dr. Emeka Obi"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">Email address</Label>
              <Input
                id="email"
                type="email"
                placeholder="observer@institution.edu.ng"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
              <p className="text-xs text-muted-foreground">
                If the email isn&apos;t already a member, an observer account will be
                created in your organization.
              </p>
            </div>
            <div className="flex items-start gap-2 rounded-lg border border-primary/20 bg-primary/5 p-3 text-xs text-muted-foreground">
              <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
              <p>
                Observers can monitor election health and turnout in real time.
                They cannot modify elections, import voters, or view ballot choices.
              </p>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setAddOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={adding || !name.trim() || !email.trim()}>
                {adding ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Adding…
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="mr-2 h-4 w-4" />
                    Add observer
                  </>
                )}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Remove confirmation */}
      <AlertDialog open={!!removeTarget} onOpenChange={(o) => !o && setRemoveTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove observer?</AlertDialogTitle>
            <AlertDialogDescription>
              {removeTarget?.user.name} will lose access to monitor this election
              immediately. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleRemove}
              disabled={removing}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {removing ? "Removing…" : "Remove observer"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </ElectionShell>
  );
}
