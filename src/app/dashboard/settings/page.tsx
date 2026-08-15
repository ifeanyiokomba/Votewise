"use client";

import { useEffect, useState, useCallback } from "react";
import { motion } from "framer-motion";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
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
import { PageHeader } from "@/components/dashboard/page-header";
import { ErrorState } from "@/components/dashboard/dashboard-skeleton";
import { Logo } from "@/components/shared/logo";
import { apiFetch } from "@/lib/api-fetch";
import { toast } from "sonner";
import { formatDate, initials } from "@/lib/utils";
import {
  Building2,
  Save,
  Loader2,
  Lock,
  LogOut,
  Trash2,
  AlertTriangle,
  Sparkles,
} from "lucide-react";
import { SUBSCRIPTION_PLANS } from "@/lib/constants";
import type { MeResponse, OrganizationDTO } from "@/components/dashboard/types";

const TIER_LABELS: Record<string, string> = {
  FREE: "Free",
  STARTER: "Starter",
  PROFESSIONAL: "Professional",
  ENTERPRISE: "Enterprise",
};

interface OrgFormState {
  name: string;
  description: string;
  logo: string;
  contactInfo: string;
  branding: string;
}

export default function SettingsPage() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [organization, setOrganization] = useState<OrganizationDTO | null>(null);
  const [form, setForm] = useState<OrgFormState>({
    name: "",
    description: "",
    logo: "",
    contactInfo: "",
    branding: "",
  });
  const [saving, setSaving] = useState(false);
  const [dangerOpen, setDangerOpen] = useState<"leave" | "delete" | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    const res = await apiFetch<MeResponse>("/api/auth/me");
    setLoading(false);
    if (!res.success || !res.data) {
      setError(res.error?.message ?? "Could not load organization");
      return;
    }
    const org = res.data.organization;
    setOrganization(org);
    if (org) {
      setForm({
        name: org.name ?? "",
        description: "",
        logo: org.logo ?? "",
        contactInfo: "",
        branding: "",
      });
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

  function update<K extends keyof OrgFormState>(key: K, value: string) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  function onSave(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    // Demo-only optimistic update — no PATCH endpoint exists yet.
    setTimeout(() => {
      setSaving(false);
      if (organization) {
        setOrganization({
          ...organization,
          name: form.name.trim() || organization.name,
          logo: form.logo.trim() || null,
        });
      }
      toast.success("Settings saved (demo)", {
        description: "Connect a PATCH /api/organization route to persist changes.",
      });
    }, 600);
  }

  if (loading) {
    return (
      <div className="flex-1 space-y-6 p-4 sm:p-6 lg:p-8">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-72 w-full rounded-xl" />
        <Skeleton className="h-72 w-full rounded-xl" />
        <Skeleton className="h-56 w-full rounded-xl" />
      </div>
    );
  }

  if (error || !organization) {
    return (
      <div className="flex-1 space-y-6 p-4 sm:p-6 lg:p-8">
        <PageHeader eyebrow="Settings" title="Organization settings" />
        <ErrorState message={error ?? "Organization not found"} onRetry={load} />
      </div>
    );
  }

  const currentPlan = SUBSCRIPTION_PLANS.find(
    (p) => p.id === organization.subscriptionTier
  );

  return (
    <div className="flex-1 space-y-6 p-4 sm:p-6 lg:p-8">
      <PageHeader
        eyebrow="Settings"
        title="Organization settings"
        description="Manage your organization's identity, branding, and contact details."
      />

      {/* Subscription tier card */}
      <motion.div
        initial={{ opacity: 0, y: 6 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.25 }}
      >
        <Card className="border-primary/20 bg-primary/5">
          <CardContent className="flex flex-wrap items-center justify-between gap-4 p-5">
            <div className="flex items-center gap-4">
              <div className="grid size-11 place-items-center rounded-xl bg-primary/15 text-primary">
                <Sparkles className="h-5 w-5" />
              </div>
              <div>
                <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  Current plan
                </p>
                <p className="text-lg font-semibold">
                  {TIER_LABELS[organization.subscriptionTier] ?? organization.subscriptionTier}
                </p>
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
              {currentPlan && (
                <>
                  <span>
                    Up to{" "}
                    <span className="font-medium text-foreground">
                      {currentPlan.maxVoters === -1
                        ? "unlimited"
                        : currentPlan.maxVoters.toLocaleString()}{" "}
                      voters
                    </span>
                  </span>
                  <span>·</span>
                  <span>
                    Up to{" "}
                    <span className="font-medium text-foreground">
                      {currentPlan.maxElections === -1
                        ? "unlimited"
                        : currentPlan.maxElections}{" "}
                      elections
                    </span>
                  </span>
                </>
              )}
              <Button asChild size="sm" variant="outline">
                <a href="/dashboard/subscription">Manage plan</a>
              </Button>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Organization profile form */}
      <motion.div
        initial={{ opacity: 0, y: 6 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.25, delay: 0.05 }}
      >
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Building2 className="h-4 w-4 text-primary" />
              Profile
            </CardTitle>
            <CardDescription>
              Public-facing identity for your organization. Visible to voters on
              the election portal.
            </CardDescription>
          </CardHeader>
          <form onSubmit={onSave}>
            <CardContent className="space-y-4">
              <div className="flex flex-wrap items-start gap-4">
                <div className="grid size-16 shrink-0 place-items-center overflow-hidden rounded-xl border bg-muted">
                  {form.logo ? (
                    <img
                      src={form.logo}
                      alt={`${form.name} logo`}
                      className="size-full object-cover"
                      onError={(e) => {
                        (e.target as HTMLImageElement).style.display = "none";
                      }}
                    />
                  ) : (
                    <span className="text-2xl font-bold text-primary">
                      {initials(form.name || organization.name)}
                    </span>
                  )}
                </div>
                <div className="min-w-[200px] flex-1 space-y-1.5">
                  <Label htmlFor="logo">Logo URL</Label>
                  <Input
                    id="logo"
                    value={form.logo}
                    onChange={(e) => update("logo", e.target.value)}
                    placeholder="https://your-logo-url.png"
                  />
                  <p className="text-[11px] text-muted-foreground">
                    Square PNG/SVG works best. Falls back to initials.
                  </p>
                </div>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <Label htmlFor="name">Organization name</Label>
                  <Input
                    id="name"
                    value={form.name}
                    onChange={(e) => update("name", e.target.value)}
                    required
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="contactInfo">Contact info</Label>
                  <Input
                    id="contactInfo"
                    value={form.contactInfo}
                    onChange={(e) => update("contactInfo", e.target.value)}
                    placeholder="email, phone, or address"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  value={form.description}
                  onChange={(e) => update("description", e.target.value)}
                  placeholder="Short public-facing description"
                  rows={3}
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="branding" className="flex items-center gap-2">
                  Branding
                  <Badge variant="outline" className="text-[10px] font-normal text-amber-700 dark:text-amber-300">
                    Demo
                  </Badge>
                </Label>
                <Textarea
                  id="branding"
                  value={form.branding}
                  onChange={(e) => update("branding", e.target.value)}
                  placeholder='JSON theme overrides (e.g. {"primary":"#0f766e"})'
                  rows={3}
                  className="font-mono text-xs"
                />
                <p className="text-[11px] text-muted-foreground">
                  Branding overrides are not persisted in this build — connect an
                  organization PATCH endpoint to enable.
                </p>
              </div>

              <Separator />

              <dl className="grid gap-3 text-sm sm:grid-cols-3">
                <div>
                  <dt className="text-xs uppercase tracking-wide text-muted-foreground">
                    Slug
                  </dt>
                  <dd className="font-mono text-xs">{organization.slug}</dd>
                </div>
                <div>
                  <dt className="text-xs uppercase tracking-wide text-muted-foreground">
                    Plan tier
                  </dt>
                  <dd className="font-medium">{organization.subscriptionTier}</dd>
                </div>
                <div>
                  <dt className="text-xs uppercase tracking-wide text-muted-foreground">
                    Created
                  </dt>
                  <dd>{formatDate(new Date().toISOString())}</dd>
                </div>
              </dl>
            </CardContent>
            <CardFooter className="justify-end gap-2">
              <Button type="button" variant="outline" onClick={load} disabled={saving}>
                Reset
              </Button>
              <Button type="submit" disabled={saving}>
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
            </CardFooter>
          </form>
        </Card>
      </motion.div>

      {/* Danger zone */}
      <motion.div
        initial={{ opacity: 0, y: 6 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.25, delay: 0.1 }}
      >
        <Card className="border-destructive/30">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base text-destructive">
              <AlertTriangle className="h-4 w-4" />
              Danger zone
            </CardTitle>
            <CardDescription>
              Irreversible organization actions. These controls are disabled in
              this build for your safety.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border p-4">
              <div className="min-w-0">
                <p className="text-sm font-medium">Leave organization</p>
                <p className="text-xs text-muted-foreground">
                  Remove yourself from this organization. You will lose access
                  to all elections and audit history.
                </p>
              </div>
              <Button
                variant="outline"
                disabled
                onClick={() => setDangerOpen("leave")}
              >
                <Lock className="h-4 w-4" />
                Locked
              </Button>
            </div>
            <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border p-4">
              <div className="min-w-0">
                <p className="text-sm font-medium text-destructive">
                  Delete organization
                </p>
                <p className="text-xs text-muted-foreground">
                  Permanently delete this organization and all associated
                  elections, voters, and audit logs. This cannot be undone.
                </p>
              </div>
              <Button
                variant="destructive"
                disabled
                onClick={() => setDangerOpen("delete")}
              >
                <Lock className="h-4 w-4" />
                Locked
              </Button>
            </div>
            <p className="flex items-center gap-2 text-xs text-muted-foreground">
              <Lock className="h-3.5 w-3.5" />
              These actions require a platform administrator. Contact
              support@votewise.com.ng to proceed.
            </p>
          </CardContent>
        </Card>
      </motion.div>

      <AlertDialog
        open={dangerOpen !== null}
        onOpenChange={(v) => !v && setDangerOpen(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              {dangerOpen === "delete" ? (
                <>
                  <Trash2 className="h-5 w-5 text-destructive" />
                  Delete organization
                </>
              ) : (
                <>
                  <LogOut className="h-5 w-5" />
                  Leave organization
                </>
              )}
            </AlertDialogTitle>
            <AlertDialogDescription>
              This action is locked in the current build. Please contact your
              platform administrator to perform this operation.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Close</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => setDangerOpen(null)}
              className="pointer-events-none opacity-60"
              tabIndex={-1}
            >
              Confirm (locked)
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <div className="flex items-center justify-center pt-2">
        <Logo size="sm" showText />
      </div>
    </div>
  );
}
