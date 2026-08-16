"use client";

import { useEffect, useState, useCallback, useMemo } from "react";
import { motion } from "framer-motion";
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
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";
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
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { ScrollArea } from "@/components/ui/scroll-area";
import { StatCard } from "@/components/shared/stat-card";
import { PageHeader } from "@/components/dashboard/page-header";
import {
  ColoredBadge,
  NEGOTIATION_STATUS_TONE,
} from "@/components/dashboard/colored-badge";
import {
  EmptyState,
  ErrorState,
  StatCardSkeleton,
} from "@/components/dashboard/dashboard-skeleton";
import { apiFetch } from "@/lib/api-fetch";
import { toast } from "sonner";
import { cn, formatCurrency, formatRelative } from "@/lib/utils";
import {
  Building2,
  Users,
  Clock,
  CheckCircle2,
  XCircle,
  Loader2,
  Mail,
  Phone,
  MessageSquare,
  Save,
  ShieldAlert,
} from "lucide-react";
import type { MeResponse, UserDTO } from "@/components/dashboard/types";

interface NegotiationDTO {
  id: string;
  activationId: string;
  organizationId: string;
  electionId: string;
  status: string;
  voterCount: number;
  standardPrice: number;
  negotiatedAmount: number | null;
  contactName: string;
  contactEmail: string;
  contactPhone: string | null;
  preferredResponseChannel: string | null;
  message: string | null;
  internalNotes: string | null;
  assignedToId: string | null;
  createdAt: string;
  updatedAt: string;
  election?: { id: string; name: string } | null;
  organization?: { id: string; name: string; slug?: string | null } | null;
  assignedTo?: { name: string; email: string } | null;
}

const STATUSES: { value: string; label: string }[] = [
  { value: "UNDER_REVIEW", label: "Under review" },
  { value: "IN_PROGRESS", label: "In progress" },
  { value: "SETTLEMENT_PENDING", label: "Settlement pending" },
  { value: "SETTLED", label: "Settled" },
  { value: "APPROVED", label: "Approved" },
  { value: "DECLINED", label: "Declined" },
];

const STATUS_LABELS: Record<string, string> = Object.fromEntries(
  STATUSES.map((s) => [s.value, s.label])
);

export default function CommercialPage() {
  const [me, setMe] = useState<UserDTO | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [negotiations, setNegotiations] = useState<NegotiationDTO[]>([]);
  const [selected, setSelected] = useState<NegotiationDTO | null>(null);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [internalNotes, setInternalNotes] = useState("");
  const [assignedToId, setAssignedToId] = useState<string>("none");
  const [statusValue, setStatusValue] = useState<string>("");
  const [negotiatedAmount, setNegotiatedAmount] = useState<string>("");

  const isPlatformAdmin = me?.role === "PLATFORM_ADMIN";

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    const meRes = await apiFetch<MeResponse>("/api/auth/me");
    if (meRes.success && meRes.data) {
      setMe(meRes.data.user);
    }
    if (!meRes.success || meRes.data?.user?.role !== "PLATFORM_ADMIN") {
      setLoading(false);
      return;
    }
    const res = await apiFetch<{ negotiations: NegotiationDTO[] }>(
      "/api/admin/negotiations"
    );
    setLoading(false);
    if (!res.success || !res.data) {
      setError(res.error?.message ?? "Could not load negotiations");
      return;
    }
    setNegotiations(res.data.negotiations);
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

  const stats = useMemo(() => {
    return {
      total: negotiations.length,
      pending: negotiations.filter((n) =>
        ["UNDER_REVIEW", "IN_PROGRESS", "SETTLEMENT_PENDING"].includes(n.status)
      ).length,
      approved: negotiations.filter((n) =>
        ["APPROVED", "SETTLED"].includes(n.status)
      ).length,
      declined: negotiations.filter((n) => n.status === "DECLINED").length,
    };
  }, [negotiations]);

  function openNegotiation(n: NegotiationDTO) {
    setSelected(n);
    setInternalNotes(n.internalNotes ?? "");
    setAssignedToId(n.assignedToId ?? "none");
    setStatusValue(n.status);
    setNegotiatedAmount(
      n.negotiatedAmount != null ? String(n.negotiatedAmount) : ""
    );
    setSheetOpen(true);
  }

  async function saveChanges() {
    if (!selected) return;
    setSaving(true);
    const body: Record<string, unknown> = { status: statusValue };
    if (internalNotes !== (selected.internalNotes ?? "")) {
      body.internalNotes = internalNotes;
    }
    if (negotiatedAmount.trim() !== "") {
      const parsed = Number(negotiatedAmount);
      if (!Number.isNaN(parsed) && parsed >= 0) {
        body.negotiatedAmount = parsed;
      }
    }
    if (assignedToId !== "none" && assignedToId !== (selected.assignedToId ?? "none")) {
      body.assignedToId = assignedToId;
    }
    const res = await apiFetch<{ negotiation: NegotiationDTO }>(
      `/api/admin/negotiations/${selected.id}`,
      {
        method: "PATCH",
        body: JSON.stringify(body),
      }
    );
    setSaving(false);
    if (!res.success) {
      toast.error("Could not save changes", { description: res.error?.message });
      return;
    }
    setNegotiations((prev) =>
      prev.map((n) =>
        n.id === selected.id
          ? {
              ...n,
              status: statusValue,
              internalNotes,
              negotiatedAmount:
                body.negotiatedAmount !== undefined
                  ? (body.negotiatedAmount as number)
                  : n.negotiatedAmount,
              assignedToId:
                assignedToId === "none" ? null : assignedToId,
            }
          : n
      )
    );
    setSelected((prev) =>
      prev
        ? {
            ...prev,
            status: statusValue,
            internalNotes,
            negotiatedAmount:
              body.negotiatedAmount !== undefined
                ? (body.negotiatedAmount as number)
                : prev.negotiatedAmount,
            assignedToId: assignedToId === "none" ? null : assignedToId,
          }
        : prev
    );
    toast.success("Negotiation updated");
  }

  // Platform-admin guard.
  if (!loading && !isPlatformAdmin) {
    return (
      <div className="flex-1 p-4 sm:p-6 lg:p-8">
        <PageHeader
          eyebrow="Platform admin"
          title="Negotiations review"
          description="Review and resolve commercial activation negotiations across all organizations."
        />
        <Card>
          <CardContent className="py-2">
            <EmptyState
              title="Access restricted to platform administrators"
              description="This view is reserved for Votewise platform administrators. Sign in with a platform admin account to access negotiation reviews."
              icon={ShieldAlert}
              action={
                <Button asChild>
                  <a href="/login">Switch account</a>
                </Button>
              }
            />
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="flex-1 space-y-6 p-4 sm:p-6 lg:p-8">
      <PageHeader
        eyebrow="Platform admin"
        title="Negotiations review"
        description="Review and resolve commercial activation negotiations across all organizations."
      />

      {/* Stats */}
      {loading ? (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <StatCardSkeleton key={i} />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard label="Total requests" value={stats.total} icon={Building2} />
          <StatCard label="Pending" value={stats.pending} icon={Clock} hint="Awaiting decision" />
          <StatCard label="Approved" value={stats.approved} icon={CheckCircle2} />
          <StatCard label="Declined" value={stats.declined} icon={XCircle} />
        </div>
      )}

      {/* Table */}
      {loading ? (
        <div className="space-y-2">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="h-14 animate-pulse rounded-lg bg-muted" />
          ))}
        </div>
      ) : error ? (
        <ErrorState message={error} onRetry={load} />
      ) : negotiations.length === 0 ? (
        <Card>
          <CardContent className="py-2">
            <EmptyState
              title="No negotiation requests"
              description="When organizations request bulk-pricing negotiations on election activations, they will appear here."
              icon={Building2}
            />
          </CardContent>
        </Card>
      ) : (
        <Card className="overflow-hidden">
          <ScrollArea className="scroll-area-custom max-h-[60vh]">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="min-w-[180px]">Organization</TableHead>
                  <TableHead className="min-w-[200px]">Election</TableHead>
                  <TableHead className="min-w-[100px] text-right">Voters</TableHead>
                  <TableHead className="hidden min-w-[120px] text-right md:table-cell">
                    Standard
                  </TableHead>
                  <TableHead className="hidden min-w-[120px] text-right lg:table-cell">
                    Proposed
                  </TableHead>
                  <TableHead className="min-w-[140px]">Status</TableHead>
                  <TableHead className="hidden min-w-[120px] xl:table-cell">
                    Contact
                  </TableHead>
                  <TableHead className="hidden min-w-[110px] sm:table-cell">
                    Requested
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {negotiations.map((n, i) => (
                  <motion.tr
                    key={n.id}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ duration: 0.2, delay: Math.min(i * 0.02, 0.2) }}
                    onClick={() => openNegotiation(n)}
                    className="cursor-pointer border-b last:border-0 hover:bg-accent/60"
                  >
                    <TableCell className="font-medium">
                      <div className="flex items-center gap-2">
                        <span className="grid size-7 shrink-0 place-items-center rounded-md bg-primary/10 text-primary">
                          <Building2 className="h-3.5 w-3.5" />
                        </span>
                        <div className="min-w-0">
                          <p className="truncate text-sm font-medium">
                            {n.organization?.name ?? "Unknown org"}
                          </p>
                          <p className="text-xs text-muted-foreground sm:hidden">
                            {n.contactName}
                          </p>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <p className="truncate text-sm">{n.election?.name ?? "—"}</p>
                      <p className="text-xs text-muted-foreground">{n.contactName}</p>
                    </TableCell>
                    <TableCell className="text-right tabular-nums">
                      <span className="inline-flex items-center gap-1 text-sm">
                        <Users className="h-3.5 w-3.5 text-muted-foreground" />
                        {n.voterCount.toLocaleString()}
                      </span>
                    </TableCell>
                    <TableCell className="hidden md:table-cell text-right tabular-nums">
                      {formatCurrency(n.standardPrice)}
                    </TableCell>
                    <TableCell className="hidden lg:table-cell text-right tabular-nums">
                      {n.negotiatedAmount != null
                        ? formatCurrency(n.negotiatedAmount)
                        : "—"}
                    </TableCell>
                    <TableCell>
                      <ColoredBadge
                        value={n.status}
                        tone={NEGOTIATION_STATUS_TONE[n.status] ?? "neutral"}
                      />
                    </TableCell>
                    <TableCell className="hidden xl:table-cell text-xs text-muted-foreground">
                      <div className="flex flex-col gap-0.5">
                        <span className="truncate">{n.contactEmail}</span>
                        {n.contactPhone && <span>{n.contactPhone}</span>}
                      </div>
                    </TableCell>
                    <TableCell className="hidden sm:table-cell text-xs text-muted-foreground">
                      {formatRelative(n.createdAt)}
                    </TableCell>
                  </motion.tr>
                ))}
              </TableBody>
            </Table>
          </ScrollArea>
        </Card>
      )}

      {/* Detail drawer */}
      <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
        <SheetContent
          side="right"
          className="w-full overflow-y-auto p-0 sm:max-w-lg"
        >
          <SheetHeader className="border-b p-4 sm:p-6">
            <SheetTitle>Negotiation review</SheetTitle>
            <SheetDescription>
              {selected?.organization?.name ?? "Unknown org"} ·{" "}
              {selected?.election?.name ?? "Unknown election"}
            </SheetDescription>
          </SheetHeader>
          {selected && (
            <div className="space-y-5 p-4 sm:p-6">
              {/* Summary */}
              <div className="grid grid-cols-2 gap-3">
                <SummaryTile
                  label="Voters"
                  value={selected.voterCount.toLocaleString()}
                  icon={Users}
                />
                <SummaryTile
                  label="Standard price"
                  value={formatCurrency(selected.standardPrice)}
                  icon={Building2}
                />
                <SummaryTile
                  label="Proposed"
                  value={
                    selected.negotiatedAmount != null
                      ? formatCurrency(selected.negotiatedAmount)
                      : "—"
                  }
                  icon={CheckCircle2}
                />
                <SummaryTile
                  label="Status"
                  value={STATUS_LABELS[selected.status] ?? selected.status}
                  icon={Clock}
                />
              </div>

              {/* Contact */}
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="flex items-center justify-between text-sm">
                    <span>Contact</span>
                    {selected.preferredResponseChannel && selected.preferredResponseChannel !== "EMAIL" && (
                      <Badge variant="outline" className="text-[10px] border-amber-300 bg-amber-50 text-amber-700 dark:border-amber-700 dark:bg-amber-950/40 dark:text-amber-300">
                        Prefers: {selected.preferredResponseChannel === "WHATSAPP" ? "💬 WhatsApp" : "📞 Phone call"}
                      </Badge>
                    )}
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-2 text-sm">
                  <div className="flex items-center gap-2">
                    <Users className="h-3.5 w-3.5 text-muted-foreground" />
                    <span className="font-medium">{selected.contactName}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Mail className="h-3.5 w-3.5 text-muted-foreground" />
                    <a
                      href={`mailto:${selected.contactEmail}`}
                      className="truncate text-primary hover:underline"
                    >
                      {selected.contactEmail}
                    </a>
                  </div>
                  {selected.contactPhone && (
                    <div className="flex items-center gap-2">
                      <Phone className="h-3.5 w-3.5 text-muted-foreground" />
                      <a
                        href={`tel:${selected.contactPhone}`}
                        className="text-primary hover:underline"
                      >
                        {selected.contactPhone}
                      </a>
                    </div>
                  )}
                  {/* Quick response actions */}
                  <div className="flex flex-wrap gap-2 pt-2">
                    <Button size="sm" variant="outline" asChild className="h-7 text-[11px]">
                      <a href={`mailto:${selected.contactEmail}?subject=Re: Election activation negotiation`}>
                        <Mail className="h-3 w-3" /> Email
                      </a>
                    </Button>
                    {selected.contactPhone && (
                      <>
                        <Button size="sm" variant="outline" asChild className="h-7 text-[11px]">
                          <a href={`tel:${selected.contactPhone}`}>
                            <Phone className="h-3 w-3" /> Call
                          </a>
                        </Button>
                        <Button size="sm" variant="outline" asChild className="h-7 text-[11px]">
                          <a href={`https://wa.me/${selected.contactPhone.replace(/[^0-9]/g, "")}`} target="_blank" rel="noopener">
                            <MessageSquare className="h-3 w-3" /> WhatsApp
                          </a>
                        </Button>
                      </>
                    )}
                  </div>
                  <p className="pt-1 text-[10px] text-muted-foreground">
                    Use these shortcuts to respond in the org&apos;s preferred channel and finalize the negotiation.
                  </p>
                </CardContent>
              </Card>

              {/* Message */}
              {selected.message && (
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="flex items-center gap-2 text-sm">
                      <MessageSquare className="h-3.5 w-3.5 text-primary" />
                      Customer message
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="whitespace-pre-wrap text-sm leading-relaxed text-muted-foreground">
                      {selected.message}
                    </p>
                  </CardContent>
                </Card>
              )}

              <Separator />

              {/* Editable controls */}
              <div className="space-y-4">
                <div className="space-y-1.5">
                  <Label htmlFor="status">Status</Label>
                  <Select value={statusValue} onValueChange={setStatusValue}>
                    <SelectTrigger id="status" className="w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {STATUSES.map((s) => (
                        <SelectItem key={s.value} value={s.value}>
                          {s.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="negotiatedAmount">
                    Negotiated amount (₦)
                  </Label>
                  <Input
                    id="negotiatedAmount"
                    type="number"
                    inputMode="numeric"
                    min={0}
                    value={negotiatedAmount}
                    onChange={(e) => setNegotiatedAmount(e.target.value)}
                    placeholder="Optional"
                  />
                  <p className="text-[11px] text-muted-foreground">
                    Leave blank to keep existing value.
                  </p>
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="internalNotes">Internal notes</Label>
                  <Textarea
                    id="internalNotes"
                    value={internalNotes}
                    onChange={(e) => setInternalNotes(e.target.value)}
                    placeholder="Visible only to platform admins…"
                    rows={4}
                  />
                </div>

                {selected.assignedTo && (
                  <div className="rounded-lg border bg-muted/30 p-3 text-xs">
                    <span className="text-muted-foreground">Currently assigned to:</span>{" "}
                    <span className="font-medium">{selected.assignedTo.name}</span>{" "}
                    <span className="text-muted-foreground">
                      ({selected.assignedTo.email})
                    </span>
                  </div>
                )}
              </div>
            </div>
          )}
          {/* Save footer with Approve / Decline quick actions */}
          <SheetFooter className="flex-col gap-3 border-t p-4 sm:p-6 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex flex-wrap gap-2">
              <Button
                size="sm"
                variant="default"
                disabled={saving || !selected || selected.status === "APPROVED"}
                onClick={() => {
                  setStatusValue("APPROVED");
                  setTimeout(() => saveChanges(), 50);
                }}
                className="bg-emerald-600 hover:bg-emerald-700"
              >
                <CheckCircle2 className="h-4 w-4" /> Approve &amp; Activate
              </Button>
              <Button
                size="sm"
                variant="outline"
                disabled={saving || !selected || selected.status === "DECLINED"}
                onClick={() => {
                  setStatusValue("DECLINED");
                  setTimeout(() => saveChanges(), 50);
                }}
                className="border-destructive/30 text-destructive hover:bg-destructive/5"
              >
                <XCircle className="h-4 w-4" /> Decline
              </Button>
            </div>
            <div className="flex gap-2">
              <Button
                variant="outline"
                onClick={() => setSheetOpen(false)}
                disabled={saving}
              >
                Close
              </Button>
              <Button onClick={saveChanges} disabled={saving || !selected}>
                {saving ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" /> Saving…
                  </>
                ) : (
                  <>
                    <Save className="h-4 w-4" /> Save changes
                  </>
                )}
              </Button>
            </div>
          </SheetFooter>
        </SheetContent>
      </Sheet>
    </div>
  );
}

function SummaryTile({
  label,
  value,
  icon: Icon,
}: {
  label: string;
  value: string;
  icon: React.ComponentType<{ className?: string }>;
}) {
  return (
    <div className="rounded-lg border bg-card p-3">
      <div className="flex items-center gap-1.5 text-[10px] uppercase tracking-wide text-muted-foreground">
        <Icon className="h-3 w-3" />
        {label}
      </div>
      <p className="mt-1 text-base font-semibold tabular-nums">{value}</p>
    </div>
  );
}
