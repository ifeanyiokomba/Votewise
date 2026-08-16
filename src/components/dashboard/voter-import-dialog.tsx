"use client";

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { apiFetch } from "@/lib/api-fetch";
import { toast } from "sonner";
import {
  Upload,
  FileSpreadsheet,
  Loader2,
  Download,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  FileUp,
  Sparkles,
} from "lucide-react";

interface PreviewRow {
  name: string;
  matricNumber?: string;
  department?: string;
  faculty?: string;
  level?: string;
  phone?: string;
  email?: string;
}

interface ImportSummary {
  total: number;
  created: number;
  updated: number;
  skipped: number;
  errors: { row: number; message: string }[];
}

interface PreviewResponse {
  mode: "preview";
  totalRows: number;
  valid: number;
  duplicates: number;
  invalid: number;
  preview: PreviewRow[];
  errors: { row: number; message: string }[];
}

interface ImportResponse extends ImportSummary {
  mode: "import";
}

interface VoterImportDialogProps {
  electionId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onImported?: () => void;
}

const TEMPLATE_HEADERS =
  "firstName,lastName,matricNumber,department,faculty,level,phone,email\n";

function downloadTemplate() {
  const sampleRows = [
    "Ada,Okafor,UNIZIK/2020/1000,Computer Science,Engineering,300,+2348012340001,ada@unizik.edu.ng",
    "Bola,Adeyemi,UNIZIK/2020/1001,Electrical Engineering,Engineering,300,+2348012340002,bola@unizik.edu.ng",
    "Chidi,Eze,UNIZIK/2020/1002,Civil Engineering,Engineering,200,+2348012340003,chidi@unizik.edu.ng",
  ];
  const csv = TEMPLATE_HEADERS + sampleRows.join("\n") + "\n";
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "votewise-voters-template.csv";
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export function VoterImportDialog({
  electionId,
  open,
  onOpenChange,
  onImported,
}: VoterImportDialogProps) {
  const [file, setFile] = useState<File | null>(null);
  const [stage, setStage] = useState<"select" | "preview" | "imported">("select");
  const [loading, setLoading] = useState<"preview" | "import" | null>(null);
  const [preview, setPreview] = useState<PreviewResponse | null>(null);
  const [importSummary, setImportSummary] = useState<ImportSummary | null>(null);
  const [dragActive, setDragActive] = useState(false);

  function reset() {
    setFile(null);
    setStage("select");
    setPreview(null);
    setImportSummary(null);
    setLoading(null);
    setDragActive(false);
  }

  async function handleFile(f: File) {
    setFile(f);
    setPreview(null);
    setImportSummary(null);
    setStage("select");
  }

  async function runPreview() {
    if (!file) return;
    setLoading("preview");
    const fd = new FormData();
    fd.append("file", file);
    fd.append("mode", "preview");
    // apiFetch wraps with JSON content-type; for multipart we bypass it.
    const res = await fetch(
      `/api/elections/${electionId}/voters/import`,
      {
        method: "POST",
        body: fd,
        credentials: "include",
      }
    );
    const json = (await res.json()) as {
      success: boolean;
      data?: PreviewResponse;
      error?: { message: string };
    };
    setLoading(null);
    if (!res.ok || !json.success || !json.data) {
      toast.error("Preview failed", { description: json.error?.message });
      return;
    }
    setPreview(json.data);
    setStage("preview");
  }

  async function runImport() {
    if (!file) return;
    setLoading("import");
    const fd = new FormData();
    fd.append("file", file);
    fd.append("mode", "import");
    const res = await fetch(
      `/api/elections/${electionId}/voters/import`,
      {
        method: "POST",
        body: fd,
        credentials: "include",
      }
    );
    const json = (await res.json()) as {
      success: boolean;
      data?: ImportResponse;
      error?: { message: string };
    };
    setLoading(null);
    if (!res.ok || !json.success || !json.data) {
      toast.error("Import failed", { description: json.error?.message });
      return;
    }
    setImportSummary(json.data);
    setStage("imported");
    toast.success("Voters imported", {
      description: `${json.data.created} created · ${json.data.updated} updated · ${json.data.skipped} skipped`,
    });
    onImported?.();
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(v) => {
        if (!v) reset();
        onOpenChange(v);
      }}
    >
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Upload className="h-5 w-5 text-primary" />
            Import voters
          </DialogTitle>
          <DialogDescription>
            Upload a CSV or XLSX file. We&apos;ll preview it first so you can verify before importing.
          </DialogDescription>
        </DialogHeader>

        {stage === "select" && (
          <div className="space-y-4">
            <div className="flex items-center justify-between rounded-lg border bg-muted/30 px-4 py-3">
              <div className="flex items-center gap-3">
                <div className="grid h-9 w-9 place-items-center rounded-lg bg-primary/10 text-primary">
                  <FileSpreadsheet className="h-4 w-4" />
                </div>
                <div>
                  <p className="text-sm font-medium">Need a template?</p>
                  <p className="text-xs text-muted-foreground">
                    Columns: <span className="font-mono">firstName, lastName, matricNumber, department, faculty, level, phone, email</span>
                  </p>
                  <p className="mt-1 text-[10px] text-muted-foreground">
                    First name and last name are separate columns. Combined &quot;name&quot; is also accepted as a fallback.
                  </p>
                </div>
              </div>
              <Button variant="outline" size="sm" onClick={downloadTemplate}>
                <Download className="h-3.5 w-3.5" />
                Template
              </Button>
            </div>

            <label
              htmlFor="voter-file-input"
              onDragOver={(e) => {
                e.preventDefault();
                setDragActive(true);
              }}
              onDragLeave={() => setDragActive(false)}
              onDrop={(e) => {
                e.preventDefault();
                setDragActive(false);
                const f = e.dataTransfer.files?.[0];
                if (f) handleFile(f);
              }}
              className={`flex cursor-pointer flex-col items-center justify-center gap-3 rounded-xl border-2 border-dashed px-6 py-10 text-center transition-colors ${
                dragActive
                  ? "border-primary bg-primary/5"
                  : "border-border hover:border-primary/40 hover:bg-muted/40"
              }`}
            >
              <div className="grid h-12 w-12 place-items-center rounded-full bg-primary/10 text-primary">
                <FileUp className="h-5 w-5" />
              </div>
              <div>
                <p className="text-sm font-medium">
                  {file ? file.name : "Drop a CSV or XLSX file here"}
                </p>
                <p className="text-xs text-muted-foreground">
                  {file
                    ? `${(file.size / 1024).toFixed(1)} KB · Click to replace`
                    : "or click to browse · max 10 MB"}
                </p>
              </div>
              <input
                id="voter-file-input"
                type="file"
                accept=".csv,.xlsx,.xls"
                className="sr-only"
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) handleFile(f);
                }}
              />
            </label>

            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => onOpenChange(false)}
                disabled={loading !== null}
              >
                Cancel
              </Button>
              <Button onClick={runPreview} disabled={!file || loading !== null}>
                {loading === "preview" ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" /> Previewing…
                  </>
                ) : (
                  <>
                    <Sparkles className="h-4 w-4" /> Preview
                  </>
                )}
              </Button>
            </DialogFooter>
          </div>
        )}

        {stage === "preview" && preview && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
              <div className="rounded-lg border bg-emerald-50/50 p-3 text-center dark:bg-emerald-950/20">
                <CheckCircle2 className="mx-auto h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                <p className="mt-1 text-lg font-semibold tabular-nums">{preview.valid}</p>
                <p className="text-[10px] uppercase tracking-wide text-muted-foreground">Valid</p>
              </div>
              <div className="rounded-lg border bg-amber-50/50 p-3 text-center dark:bg-amber-950/20">
                <AlertTriangle className="mx-auto h-4 w-4 text-amber-600 dark:text-amber-400" />
                <p className="mt-1 text-lg font-semibold tabular-nums">{preview.duplicates}</p>
                <p className="text-[10px] uppercase tracking-wide text-muted-foreground">Duplicates</p>
              </div>
              <div className="rounded-lg border bg-destructive/5 p-3 text-center">
                <XCircle className="mx-auto h-4 w-4 text-destructive" />
                <p className="mt-1 text-lg font-semibold tabular-nums">{preview.invalid}</p>
                <p className="text-[10px] uppercase tracking-wide text-muted-foreground">Invalid</p>
              </div>
              <div className="rounded-lg border bg-muted/40 p-3 text-center">
                <FileSpreadsheet className="mx-auto h-4 w-4 text-muted-foreground" />
                <p className="mt-1 text-lg font-semibold tabular-nums">{preview.totalRows}</p>
                <p className="text-[10px] uppercase tracking-wide text-muted-foreground">Total rows</p>
              </div>
            </div>

            {preview.preview.length > 0 && (
              <div className="space-y-2">
                <p className="text-xs font-medium text-muted-foreground">
                  Sample (first {Math.min(preview.preview.length, 10)} valid rows):
                </p>
                <ScrollArea className="max-h-60 scroll-area-custom rounded-lg border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Name</TableHead>
                        <TableHead>Matric</TableHead>
                        <TableHead className="hidden sm:table-cell">Dept</TableHead>
                        <TableHead className="hidden md:table-cell">Email</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {preview.preview.slice(0, 10).map((row, i) => (
                        <TableRow key={i}>
                          <TableCell className="font-medium">{row.name}</TableCell>
                          <TableCell className="text-xs">{row.matricNumber ?? "—"}</TableCell>
                          <TableCell className="hidden text-xs sm:table-cell">
                            {row.department ?? "—"}
                          </TableCell>
                          <TableCell className="hidden text-xs md:table-cell">
                            {row.email ?? "—"}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </ScrollArea>
              </div>
            )}

            {preview.errors.length > 0 && (
              <Alert>
                <AlertTriangle className="h-4 w-4" />
                <AlertTitle>{preview.errors.length} row(s) need attention</AlertTitle>
                <AlertDescription>
                  <ScrollArea className="max-h-32 scroll-area-custom">
                    <ul className="mt-1 space-y-1 text-xs">
                      {preview.errors.slice(0, 20).map((e, i) => (
                        <li key={i} className="flex gap-2">
                          <Badge variant="outline" className="h-5 shrink-0 px-1.5 text-[10px]">
                            row {e.row}
                          </Badge>
                          <span>{e.message}</span>
                        </li>
                      ))}
                      {preview.errors.length > 20 && (
                        <li className="text-muted-foreground">
                          …and {preview.errors.length - 20} more
                        </li>
                      )}
                    </ul>
                  </ScrollArea>
                </AlertDescription>
              </Alert>
            )}

            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => setStage("select")}
                disabled={loading !== null}
              >
                Back
              </Button>
              <Button
                onClick={runImport}
                disabled={loading !== null || preview.valid === 0}
              >
                {loading === "import" ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" /> Importing…
                  </>
                ) : (
                  <>
                    <Upload className="h-4 w-4" /> Import {preview.valid} voter(s)
                  </>
                )}
              </Button>
            </DialogFooter>
          </div>
        )}

        {stage === "imported" && importSummary && (
          <div className="space-y-4">
            <div className="flex flex-col items-center gap-3 py-4 text-center">
              <div className="grid h-14 w-14 place-items-center rounded-full bg-emerald-100 text-emerald-600 dark:bg-emerald-950/40 dark:text-emerald-300">
                <CheckCircle2 className="h-7 w-7" />
              </div>
              <div>
                <p className="text-lg font-semibold">Import complete</p>
                <p className="text-sm text-muted-foreground">
                  Processed {importSummary.total} row(s) successfully.
                </p>
              </div>
            </div>
            <div className="grid grid-cols-3 gap-2 text-center">
              <div className="rounded-lg border bg-emerald-50/50 p-3 dark:bg-emerald-950/20">
                <p className="text-xl font-semibold tabular-nums text-emerald-600 dark:text-emerald-400">
                  {importSummary.created}
                </p>
                <p className="text-[10px] uppercase tracking-wide text-muted-foreground">Created</p>
              </div>
              <div className="rounded-lg border bg-primary/5 p-3">
                <p className="text-xl font-semibold tabular-nums text-primary">
                  {importSummary.updated}
                </p>
                <p className="text-[10px] uppercase tracking-wide text-muted-foreground">Updated</p>
              </div>
              <div className="rounded-lg border bg-muted/40 p-3">
                <p className="text-xl font-semibold tabular-nums">
                  {importSummary.skipped}
                </p>
                <p className="text-[10px] uppercase tracking-wide text-muted-foreground">Skipped</p>
              </div>
            </div>
            {importSummary.errors.length > 0 && (
              <Alert>
                <AlertTriangle className="h-4 w-4" />
                <AlertTitle>{importSummary.errors.length} error(s)</AlertTitle>
                <AlertDescription>
                  <ul className="mt-1 space-y-1 text-xs">
                    {importSummary.errors.slice(0, 5).map((e, i) => (
                      <li key={i}>
                        Row {e.row}: {e.message}
                      </li>
                    ))}
                  </ul>
                </AlertDescription>
              </Alert>
            )}
            <DialogFooter>
              <Button
                onClick={() => {
                  reset();
                  onOpenChange(false);
                }}
              >
                Done
              </Button>
            </DialogFooter>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
