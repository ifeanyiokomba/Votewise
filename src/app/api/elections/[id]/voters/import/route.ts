import { ok, handleError, fail } from "@/lib/api-response";
import { VoterService, type VoterRow } from "@/services/voter.service";
import { OrganizationService } from "@/services/organization.service";
import { requireOrgAdmin } from "@/lib/session";
import { AuditService } from "@/services/audit.service";
import Papa from "papaparse";
import * as XLSX from "xlsx";
import { MAX_FILE_SIZE_MB } from "@/lib/constants";

type Params = { params: Promise<{ id: string }> };

function normalizeRow(raw: Record<string, unknown>): VoterRow {
  const get = (k: string) => {
    const key = Object.keys(raw).find(
      (rk) => rk.trim().toLowerCase() === k.trim().toLowerCase()
    );
    const v = key ? raw[key] : undefined;
    return v == null ? undefined : String(v).trim();
  };
  return {
    name: get("name") ?? get("full name") ?? get("voter name") ?? "",
    matricNumber: get("matric number") ?? get("matric") ?? get("matric no") ?? get("id"),
    department: get("department") ?? get("dept"),
    faculty: get("faculty"),
    level: get("level") ?? get("year"),
    phone: get("phone") ?? get("mobile") ?? get("telephone"),
    email: get("email") ?? get("email address"),
  };
}

export async function POST(request: Request, { params }: Params) {
  try {
    const user = await requireOrgAdmin();
    const { id } = await params;
    await OrganizationService.getElectionOrFail(id, user.organizationId!);

    const formData = await request.formData();
    const file = formData.get("file") as File | null;
    const mode = (formData.get("mode") as string) ?? "import";

    if (!file) return fail("No file uploaded", "NO_FILE", 400);
    if (file.size > MAX_FILE_SIZE_MB * 1024 * 1024) {
      return fail(`File exceeds ${MAX_FILE_SIZE_MB}MB limit`, "FILE_TOO_LARGE", 413);
    }

    const name = file.name.toLowerCase();
    const buf = Buffer.from(await file.arrayBuffer());

    let rows: VoterRow[] = [];

    if (name.endsWith(".csv")) {
      const text = buf.toString("utf-8");
      const parsed = Papa.parse<Record<string, unknown>>(text, {
        header: true,
        skipEmptyLines: true,
      });
      rows = parsed.data.map(normalizeRow);
    } else if (name.endsWith(".xlsx") || name.endsWith(".xls")) {
      const wb = XLSX.read(buf, { type: "buffer" });
      const sheet = wb.Sheets[wb.SheetNames[0]];
      const json = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, {
        defval: "",
      });
      rows = json.map(normalizeRow);
    } else {
      return fail("Unsupported file type. Use CSV or XLSX.", "BAD_TYPE", 400);
    }

    const preview = await VoterService.previewImport(rows);

    if (mode === "preview") {
      return ok({
        mode: "preview",
        totalRows: rows.length,
        valid: preview.valid.length,
        duplicates: preview.duplicates.length,
        invalid: preview.invalid.length,
        preview: preview.valid.slice(0, 10),
        errors: [...preview.invalid, ...preview.duplicates.map((d) => ({ row: d.row, message: `Duplicate within file: ${d.identifier}` }))],
      });
    }

    const result = await VoterService.import(
      id,
      user.organizationId!,
      preview.valid
    );

    await AuditService.log({
      actorId: user.id,
      organizationId: user.organizationId,
      action: "VOTER_IMPORT",
      resource: "voter",
      resourceId: id,
      result: "SUCCESS",
      metadata: {
        created: result.created,
        updated: result.updated,
        skipped: result.skipped,
        errors: result.errors.length,
      },
    });

    return ok({ mode: "import", ...result });
  } catch (e) {
    return handleError(e);
  }
}
