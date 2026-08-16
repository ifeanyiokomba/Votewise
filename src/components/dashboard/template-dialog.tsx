"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { apiFetch } from "@/lib/api-fetch";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import {
  LayoutTemplate,
  Check,
  Loader2,
  Users,
  Vote,
  ArrowRight,
  Plus,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface Template {
  id: string;
  name: string;
  description: string;
  type: string;
  positionCount: number;
  candidateCount: number;
}

interface TemplateDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function TemplateDialog({ open, onOpenChange }: TemplateDialogProps) {
  const router = useRouter();
  const [templates, setTemplates] = useState<Template[]>([]);
  const [loading, setLoading] = useState(false);
  const [selected, setSelected] = useState<string | null>(null);
  const [electionName, setElectionName] = useState("");
  const [creating, setCreating] = useState(false);

  async function loadTemplates() {
    setLoading(true);
    const res = await apiFetch<{ templates: Template[] }>("/api/election-templates");
    setLoading(false);
    if (res.success && res.data) {
      setTemplates(res.data.templates);
    }
  }

  // Load templates when dialog opens
  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    (async () => {
      if (cancelled) return;
      await loadTemplates();
    })();
    return () => {
      cancelled = true;
    };
  }, [open]);

  async function handleCreate() {
    if (!selected) return;
    setCreating(true);
    const res = await apiFetch<{ election: { id: string } }>("/api/election-templates", {
      method: "POST",
      body: JSON.stringify({
        templateId: selected,
        electionName: electionName.trim() || undefined,
      }),
    });
    setCreating(false);
    if (!res.success || !res.data?.election) {
      toast.error("Could not create from template", { description: res.error?.message });
      return;
    }
    const template = templates.find((t) => t.id === selected);
    toast.success("Election created from template", {
      description: `${template?.name} — ${template?.positionCount} position(s) and ${template?.candidateCount} candidate(s) added.`,
    });
    onOpenChange(false);
    setSelected(null);
    setElectionName("");
    router.push(`/dashboard/elections/${res.data.election.id}`);
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        onOpenChange(o);
        if (o) loadTemplates();
      }}
    >
      <DialogContent className="max-h-[85vh] max-w-2xl overflow-hidden p-0">
        <DialogHeader className="border-b px-6 py-4">
          <DialogTitle className="flex items-center gap-2">
            <LayoutTemplate className="h-5 w-5 text-primary" />
            Start from a template
          </DialogTitle>
          <DialogDescription>
            Pre-built election setups you can customize. Positions and candidates are added
            automatically — edit them after creation.
          </DialogDescription>
        </DialogHeader>

        <div className="max-h-[55vh] overflow-y-auto scroll-area-custom px-6 py-4">
          {loading ? (
            <div className="space-y-3">
              {Array.from({ length: 4 }).map((_, i) => (
                <Skeleton key={i} className="h-24 w-full" />
              ))}
            </div>
          ) : (
            <div className="space-y-2">
              {templates.map((t) => (
                <button
                  key={t.id}
                  onClick={() => setSelected(t.id)}
                  className={cn(
                    "group flex w-full items-start gap-3 rounded-xl border p-4 text-left transition-all hover:border-primary/40 hover:bg-accent/40",
                    selected === t.id && "border-primary bg-primary/5 ring-1 ring-primary/20"
                  )}
                >
                  <div
                    className={cn(
                      "mt-0.5 grid h-9 w-9 shrink-0 place-items-center rounded-lg transition-colors",
                      selected === t.id
                        ? "bg-primary text-primary-foreground"
                        : "bg-primary/10 text-primary"
                    )}
                  >
                    {selected === t.id ? (
                      <Check className="h-4 w-4" />
                    ) : (
                      <LayoutTemplate className="h-4 w-4" />
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <p className="font-medium">{t.name}</p>
                      <Badge variant="outline" className="text-[10px]">
                        {t.type.replace(/_/g, " ").toLowerCase()}
                      </Badge>
                    </div>
                    <p className="mt-0.5 text-xs text-muted-foreground">{t.description}</p>
                    <div className="mt-2 flex items-center gap-3 text-[11px] text-muted-foreground">
                      <span className="inline-flex items-center gap-1">
                        <Vote className="h-3 w-3" />
                        {t.positionCount} position{t.positionCount === 1 ? "" : "s"}
                      </span>
                      <span className="inline-flex items-center gap-1">
                        <Users className="h-3 w-3" />
                        {t.candidateCount} candidate{t.candidateCount === 1 ? "" : "s"}
                      </span>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>

        {selected && (
          <div className="border-t px-6 py-4">
            <div className="space-y-2">
              <Label htmlFor="electionName" className="text-xs">
                Election name (optional — defaults to template name)
              </Label>
              <Input
                id="electionName"
                placeholder="e.g. 2025 SUG Elections"
                value={electionName}
                onChange={(e) => setElectionName(e.target.value)}
              />
            </div>
          </div>
        )}

        <DialogFooter className="border-t px-6 py-4">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleCreate} disabled={!selected || creating}>
            {creating ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Creating…
              </>
            ) : (
              <>
                <Plus className="mr-2 h-4 w-4" />
                Create election
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
