"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { apiFetch } from "@/lib/api-fetch";
import { toast } from "sonner";
import { Loader2, Rocket, AlertTriangle } from "lucide-react";
import Link from "next/link";
import type { ElectionDTO } from "./types";

const ELECTION_TYPES: { value: string; label: string; description: string }[] = [
  { value: "GENERAL", label: "General", description: "Org-wide election (e.g. SUG, association)." },
  { value: "FACULTY", label: "Faculty", description: "Faculty-level representatives." },
  { value: "DEPARTMENT", label: "Department", description: "Departmental / class reps." },
  { value: "EXECUTIVE", label: "Executive", description: "Executive council / board." },
  { value: "CONFIDENCE", label: "Confidence Vote", description: "Yes/no confidence motion." },
  { value: "BALLOT_MEASURE", label: "Ballot Measure", description: "Proposition or referendum." },
];

interface CreateElectionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreated?: (electionId: string) => void;
}

export function CreateElectionDialog({
  open,
  onOpenChange,
  onCreated,
}: CreateElectionDialogProps) {
  const router = useRouter();
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [type, setType] = useState("GENERAL");
  const [startTime, setStartTime] = useState("");
  const [endTime, setEndTime] = useState("");
  const [timezone, setTimezone] = useState("Africa/Lagos");
  const [loading, setLoading] = useState(false);
  const [limitExceeded, setLimitExceeded] = useState<string | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});

  function reset() {
    setName("");
    setDescription("");
    setType("GENERAL");
    setStartTime("");
    setEndTime("");
    setTimezone("Africa/Lagos");
    setLimitExceeded(null);
    setErrors({});
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErrors({});
    setLimitExceeded(null);

    const errs: Record<string, string> = {};
    if (name.trim().length < 3) errs.name = "Election name must be at least 3 characters";
    if (startTime && endTime && new Date(startTime) >= new Date(endTime)) {
      errs.endTime = "End time must be after start time";
    }
    if (Object.keys(errs).length > 0) {
      setErrors(errs);
      return;
    }

    setLoading(true);
    const res = await apiFetch<{ election?: ElectionDTO; limitExceeded?: boolean; message?: string }>(
      "/api/elections",
      {
        method: "POST",
        body: JSON.stringify({
          name: name.trim(),
          description: description.trim() || undefined,
          type,
          startTime: startTime || undefined,
          endTime: endTime || undefined,
          timezone,
        }),
      }
    );
    setLoading(false);

    if (!res.success) {
      toast.error("Could not create election", {
        description: res.error?.message,
      });
      return;
    }

    if (res.data?.limitExceeded) {
      setLimitExceeded(
        res.data.message ??
          "Your plan allows a limited number of active elections. Upgrade to create more."
      );
      return;
    }

    if (!res.data?.election) {
      toast.error("Could not create election");
      return;
    }

    toast.success("Election created", {
      description: `${res.data.election.name} is now in configuration.`,
    });
    const id = res.data.election.id;
    reset();
    if (onCreated) {
      onCreated(id);
    } else {
      router.push(`/dashboard/elections/${id}`);
    }
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(v) => {
        if (!v) reset();
        onOpenChange(v);
      }}
    >
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Rocket className="h-5 w-5 text-primary" />
            Create a new election
          </DialogTitle>
          <DialogDescription>
            Set up the basics. You can adjust positions, candidates and voters from the command center.
          </DialogDescription>
        </DialogHeader>

        {limitExceeded && (
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertTitle>Plan limit reached</AlertTitle>
            <AlertDescription className="space-y-2">
              <p>{limitExceeded}</p>
              <Button asChild size="sm" variant="outline">
                <Link href="/dashboard/subscription" onClick={() => onOpenChange(false)}>
                  View plans
                </Link>
              </Button>
            </AlertDescription>
          </Alert>
        )}

        <form onSubmit={handleSubmit} className="grid gap-4">
          <div className="grid gap-1.5">
            <Label htmlFor="ele-name">Election name *</Label>
            <Input
              id="ele-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Student Union Government Elections 2025"
              autoFocus
              aria-invalid={!!errors.name}
            />
            {errors.name && <p className="text-xs text-destructive">{errors.name}</p>}
          </div>

          <div className="grid gap-1.5">
            <Label htmlFor="ele-desc">Description</Label>
            <Textarea
              id="ele-desc"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Short description of the election"
              rows={3}
            />
          </div>

          <div className="grid gap-1.5">
            <Label htmlFor="ele-type">Type</Label>
            <Select value={type} onValueChange={setType}>
              <SelectTrigger id="ele-type" className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {ELECTION_TYPES.map((t) => (
                  <SelectItem key={t.value} value={t.value}>
                    <div className="flex flex-col">
                      <span className="font-medium">{t.label}</span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">
              {ELECTION_TYPES.find((t) => t.value === type)?.description}
            </p>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="grid gap-1.5">
              <Label htmlFor="ele-start">Start time</Label>
              <Input
                id="ele-start"
                type="datetime-local"
                value={startTime}
                onChange={(e) => setStartTime(e.target.value)}
              />
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="ele-end">End time</Label>
              <Input
                id="ele-end"
                type="datetime-local"
                value={endTime}
                onChange={(e) => setEndTime(e.target.value)}
                aria-invalid={!!errors.endTime}
              />
              {errors.endTime && (
                <p className="text-xs text-destructive">{errors.endTime}</p>
              )}
            </div>
          </div>

          <div className="grid gap-1.5">
            <Label htmlFor="ele-tz">Timezone</Label>
            <Input id="ele-tz" value={timezone} onChange={(e) => setTimezone(e.target.value)} />
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={loading}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={loading || !name.trim()}>
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" /> Creating…
                </>
              ) : (
                <>
                  <Rocket className="h-4 w-4" /> Create election
                </>
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
