"use client";

import { useEffect, useState, useCallback, useMemo } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { ElectionShell } from "@/components/dashboard/election-shell";
import { VoterImportDialog } from "@/components/dashboard/voter-import-dialog";
import { EmptyState, ErrorState } from "@/components/dashboard/dashboard-skeleton";
import { apiFetch } from "@/lib/api-fetch";
import { toast } from "sonner";
import {
  Search,
  Upload,
  Users,
  Mail,
  Phone,
  Loader2,
  CheckCircle2,
  XCircle,
  UserPlus,
} from "lucide-react";
import { formatNumber, maskEmail, maskPhone } from "@/lib/utils";
import type { VoterDTO } from "@/components/dashboard/types";

interface VotersResponse {
  voters: VoterDTO[];
}

export default function VotersPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const [electionId, setElectionId] = useState<string | null>(null);
  const [voters, setVoters] = useState<VoterDTO[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [importOpen, setImportOpen] = useState(false);
  const [addVoterOpen, setAddVoterOpen] = useState(false);
  const [voterForm, setVoterForm] = useState({ firstName: "", lastName: "", email: "", phone: "", matricNumber: "", department: "", faculty: "", level: "" });
  const [addingVoter, setAddingVoter] = useState(false);
  const [togglingId, setTogglingId] = useState<string | null>(null);

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
    const url = search
      ? `/api/elections/${electionId}/voters?search=${encodeURIComponent(search)}`
      : `/api/elections/${electionId}/voters`;
    const res = await apiFetch<VotersResponse>(url);
    setLoading(false);
    if (!res.success || !res.data) {
      setError(res.error?.message ?? "Could not load voters");
      return;
    }
    setVoters(res.data.voters);
  }, [electionId, search]);

  useEffect(() => {
    if (!electionId) return;
    let cancelled = false;
    const t = setTimeout(() => {
      if (cancelled) return;
      (async () => {
        await load();
      })();
    }, 250); // debounce
    return () => {
      cancelled = true;
      clearTimeout(t);
    };
  }, [electionId, search, load]);

  async function toggleEligible(v: VoterDTO) {
    if (!electionId) return;
    setTogglingId(v.id);
    const res = await apiFetch<{ updated: boolean }>(
      `/api/elections/${electionId}/voters`,
      {
        method: "POST",
        body: JSON.stringify({ id: v.id, eligible: !v.isEligible }),
      }
    );
    setTogglingId(null);
    if (!res.success) {
      toast.error("Could not update voter", { description: res.error?.message });
      return;
    }
    setVoters((prev) =>
      prev.map((x) => (x.id === v.id ? { ...x, isEligible: !v.isEligible } : x))
    );
    toast.success(
      `${v.name} ${!v.isEligible ? "is now eligible" : "is now ineligible"}`
    );
  }

  const stats = useMemo(() => {
    const total = voters.length;
    const eligible = voters.filter((v) => v.isEligible).length;
    return { total, eligible, ineligible: total - eligible };
  }, [voters]);

  return (
    <ElectionShell electionId={electionId ?? ""} activeTab="voters">
      <div className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-lg font-semibold tracking-tight">Voters</h2>
            <p className="text-sm text-muted-foreground">
              Manage the voter roll. Toggle eligibility to control who can vote.
            </p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => setAddVoterOpen(true)} disabled={!electionId}>
              <UserPlus className="h-4 w-4" /> Add voter
            </Button>
            <Button onClick={() => setImportOpen(true)} disabled={!electionId}>
              <Upload className="h-4 w-4" /> Import voters
            </Button>
          </div>
        </div>

        {/* Summary pills */}
        <div className="grid grid-cols-3 gap-2">
          <div className="rounded-lg border bg-card p-3">
            <p className="text-[10px] uppercase tracking-wide text-muted-foreground">Total</p>
            <p className="text-lg font-semibold tabular-nums">
              {formatNumber(stats.total)}
            </p>
          </div>
          <div className="rounded-lg border bg-emerald-50/50 p-3 dark:bg-emerald-950/20">
            <p className="text-[10px] uppercase tracking-wide text-muted-foreground">Eligible</p>
            <p className="text-lg font-semibold tabular-nums text-emerald-600 dark:text-emerald-400">
              {formatNumber(stats.eligible)}
            </p>
          </div>
          <div className="rounded-lg border bg-muted/40 p-3">
            <p className="text-[10px] uppercase tracking-wide text-muted-foreground">Ineligible</p>
            <p className="text-lg font-semibold tabular-nums">
              {formatNumber(stats.ineligible)}
            </p>
          </div>
        </div>

        {/* Toolbar */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by name, matric, email, phone…"
            className="pl-9"
          />
        </div>

        {loading ? (
          <div className="space-y-2">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="h-12 animate-pulse rounded-lg bg-muted" />
            ))}
          </div>
        ) : error ? (
          <ErrorState message={error} onRetry={load} />
        ) : voters.length === 0 ? (
          <Card>
            <CardContent className="py-2">
              <EmptyState
                title={search ? "No voters match your search" : "No voters yet"}
                description={
                  search
                    ? "Try a different name, matric number, email or phone."
                    : "Import a CSV or XLSX with names and contact details to seed your voter roll."
                }
                icon={Users}
                action={
                  search ? (
                    <Button variant="outline" onClick={() => setSearch("")}>
                      Clear search
                    </Button>
                  ) : (
                    <Button onClick={() => setImportOpen(true)}>
                      <Upload className="h-4 w-4" /> Import voters
                    </Button>
                  )
                }
              />
            </CardContent>
          </Card>
        ) : (
          <Card className="overflow-hidden">
            <ScrollArea className="scroll-area-custom max-h-[60vh]">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="min-w-[160px]">Name</TableHead>
                    <TableHead className="min-w-[140px]">Matric</TableHead>
                    <TableHead className="hidden min-w-[140px] md:table-cell">
                      Department
                    </TableHead>
                    <TableHead className="hidden min-w-[160px] lg:table-cell">
                      Email
                    </TableHead>
                    <TableHead className="hidden min-w-[120px] xl:table-cell">
                      Phone
                    </TableHead>
                    <TableHead className="text-right">Eligible</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {voters.map((v) => (
                    <TableRow key={v.id}>
                      <TableCell>
                        <div className="font-medium">{v.name}</div>
                        <div className="text-[10px] text-muted-foreground">
                          {v.faculty ?? "—"}
                          {v.level ? ` · ${v.level}` : ""}
                        </div>
                      </TableCell>
                      <TableCell className="text-xs">
                        {v.matricNumber ?? (
                          <span className="italic text-muted-foreground">—</span>
                        )}
                      </TableCell>
                      <TableCell className="hidden text-xs md:table-cell">
                        {v.department ?? "—"}
                      </TableCell>
                      <TableCell className="hidden text-xs lg:table-cell">
                        {v.email ? (
                          <span className="inline-flex items-center gap-1">
                            <Mail className="h-3 w-3 text-muted-foreground" />
                            {maskEmail(v.email)}
                          </span>
                        ) : (
                          "—"
                        )}
                      </TableCell>
                      <TableCell className="hidden text-xs xl:table-cell">
                        {v.phone ? (
                          <span className="inline-flex items-center gap-1">
                            <Phone className="h-3 w-3 text-muted-foreground" />
                            {maskPhone(v.phone)}
                          </span>
                        ) : (
                          "—"
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-2">
                          {v.isEligible ? (
                            <Badge
                              variant="outline"
                              className="border-emerald-300 bg-emerald-50 text-[10px] text-emerald-700 dark:border-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300"
                            >
                              <CheckCircle2 className="h-3 w-3" /> Eligible
                            </Badge>
                          ) : (
                            <Badge
                              variant="outline"
                              className="border-muted bg-muted text-[10px] text-muted-foreground"
                            >
                              <XCircle className="h-3 w-3" /> Blocked
                            </Badge>
                          )}
                          <Switch
                            checked={v.isEligible}
                            onCheckedChange={() => toggleEligible(v)}
                            disabled={togglingId === v.id}
                            aria-label={`Toggle eligibility for ${v.name}`}
                          />
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </ScrollArea>
          </Card>
        )}
      </div>

      <VoterImportDialog
        electionId={electionId ?? ""}
        open={importOpen}
        onOpenChange={setImportOpen}
        onImported={load}
      />

      {/* Add voter dialog */}
      <Dialog open={addVoterOpen} onOpenChange={setAddVoterOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <UserPlus className="h-5 w-5 text-primary" />
              Add voter manually
            </DialogTitle>
            <DialogDescription>
              Register a single voter. They&apos;ll be able to verify and vote once the election is live.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="firstName">First name *</Label>
                <Input id="firstName" value={voterForm.firstName} onChange={(e) => setVoterForm({ ...voterForm, firstName: e.target.value })} placeholder="John" />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="lastName">Last name *</Label>
                <Input id="lastName" value={voterForm.lastName} onChange={(e) => setVoterForm({ ...voterForm, lastName: e.target.value })} placeholder="Doe" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="email">Email</Label>
                <Input id="email" type="email" value={voterForm.email} onChange={(e) => setVoterForm({ ...voterForm, email: e.target.value })} placeholder="john@org.edu.ng" />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="phone">Phone</Label>
                <Input id="phone" value={voterForm.phone} onChange={(e) => setVoterForm({ ...voterForm, phone: e.target.value })} placeholder="+2348012345678" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="matric">Matric / ID number</Label>
                <Input id="matric" value={voterForm.matricNumber} onChange={(e) => setVoterForm({ ...voterForm, matricNumber: e.target.value })} placeholder="UNILAG/2020/123" />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="dept">Department</Label>
                <Input id="dept" value={voterForm.department} onChange={(e) => setVoterForm({ ...voterForm, department: e.target.value })} placeholder="Computer Science" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="faculty">Faculty</Label>
                <Input id="faculty" value={voterForm.faculty} onChange={(e) => setVoterForm({ ...voterForm, faculty: e.target.value })} placeholder="Engineering" />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="level">Level</Label>
                <Input id="level" value={voterForm.level} onChange={(e) => setVoterForm({ ...voterForm, level: e.target.value })} placeholder="300" />
              </div>
            </div>
            <p className="text-xs text-muted-foreground">* At least one of email, phone, or matric number is required for OTP verification.</p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAddVoterOpen(false)}>Cancel</Button>
            <Button
              disabled={addingVoter || !voterForm.firstName.trim() || !voterForm.lastName.trim()}
              onClick={async () => {
                setAddingVoter(true);
                const res = await apiFetch(`/api/elections/${electionId}/voters/add`, {
                  method: "POST",
                  body: JSON.stringify(voterForm),
                });
                setAddingVoter(false);
                if (res.success) {
                  toast.success("Voter added", { description: `${voterForm.firstName} ${voterForm.lastName} has been registered.` });
                  setVoterForm({ firstName: "", lastName: "", email: "", phone: "", matricNumber: "", department: "", faculty: "", level: "" });
                  setAddVoterOpen(false);
                  load();
                } else {
                  toast.error("Could not add voter", { description: res.error?.message });
                }
              }}
            >
              {addingVoter ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Adding…</> : <><UserPlus className="mr-2 h-4 w-4" /> Add voter</>}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </ElectionShell>
  );
}
