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
  const get = (...keys: string[]) => {
    for (const k of keys) {
      const key = Object.keys(raw).find(
        (rk) => rk.trim().toLowerCase() === k.trim().toLowerCase()
      );
      const v = key ? raw[key] : undefined;
      if (v != null && String(v).trim()) return String(v).trim();
    }
    return undefined;
  };

  // Support separate first name / last name columns, or combined "name" / "full name"
  const firstName = get("first name", "firstname", "first");
  const lastName = get("last name", "lastname", "last", "surname");
  const fullName = get("name", "full name", "voter name", "full_name");

  // Combine: prefer first+last, fall back to full name
  let name = "";
  if (firstName && lastName) {
    name = `${firstName} ${lastName}`;
  } else if (firstName) {
    name = firstName;
  } else if (lastName) {
    name = lastName;
  } else {
    name = fullName ?? "";
  }

  return {
    name,
    matricNumber: get("matric number", "matric", "matric no", "matric_number", "id", "voter id"),
    department: get("department", "dept"),
    faculty: get("faculty"),
    level: get("level", "year"),
    phone: get("phone", "mobile", "telephone", "phone number"),
    email: get("email", "email address", "email_address"),
  };
}

// Validate a row and return a detailed error message with guidance
function validateRow(row: VoterRow, index: number): { valid: boolean; error?: string } {
  if (!row.name || row.name.trim().length < 2) {
    return {
      valid: false,
      error: `Row ${index + 1}: Missing or too short voter name. Ensure the "First Name" and "Last Name" (or "Name") column is filled.`,
    };
  }
  if (!row.email && !row.phone) {
    return {
      valid: false,
      error: `Row ${index + 1}: Voter "${row.name}" has neither email nor phone. At least one is required for OTP verification.`,
    };
  }
  if (!row.matricNumber && !row.email && !row.phone) {
    return {
      valid: false,
      error: `Row ${index + 1}: Voter "${row.name}" has no unique identifier (matric number, email, or phone).`,
    };
  }
  return { valid: true };
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

    // Run detailed validation on each row
    const detailedErrors: { row: number; message: string; guidance: string }[] = [];
    rows.forEach((row, idx) => {
      const validation = validateRow(row, idx);
      if (!validation.valid && validation.error) {
        detailedErrors.push({
          row: idx + 1,
          message: validation.error,
          guidance: "Fix this row in your CSV and re-upload. Make sure the column headers are: First Name, Last Name, Email, Phone, Matric Number, Department, Faculty, Level.",
        });
      }
    });

    if (mode === "preview") {
      return ok({
        mode: "preview",
        totalRows: rows.length,
        valid: preview.valid.length,
        duplicates: preview.duplicates.length,
        invalid: preview.invalid.length,
        preview: preview.valid.slice(0, 10),
        errors: [
          ...detailedErrors,
          ...preview.invalid.map((e) => ({ row: e.row, message: e.message, guidance: "Fix and re-upload." })),
          ...preview.duplicates.map((d) => ({
            row: d.row,
            message: `Duplicate within file: ${d.identifier}`,
            guidance: "This voter appears more than once in the file. Remove duplicates and re-upload.",
          })),
        ],
        // Include expected CSV format for guidance
        expectedFormat: {
          headers: ["First Name", "Last Name", "Email", "Phone", "Matric Number", "Department", "Faculty", "Level"],
          example: "John,Doe,john@unilag.edu.ng,+2348012345678,UNILAG/2020/123,Computer Science,Engineering,300",
          notes: "First Name and Last Name are required. At least one of Email, Phone, or Matric Number is required for OTP verification.",
        },
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
