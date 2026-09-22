import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { requireAdminRole } from "@/lib/auth";
import { parseCandidateExcel } from "@/lib/excel";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  const session = await requireAdminRole(["super_admin", "hr"]);
  if (!session) return NextResponse.json({ error: "Not authorized." }, { status: 401 });

  const form = await req.formData();
  const assessmentId = String(form.get("assessmentId") || "");
  const file = form.get("file") as File | null;

  if (!assessmentId || !file) {
    return NextResponse.json({ error: "Select an assessment and a file." }, { status: 400 });
  }

  let parsed;
  try {
    const buffer = Buffer.from(await file.arrayBuffer());
    parsed = await parseCandidateExcel(buffer);
  } catch (err) {
    console.error("excel parse error", err);
    return NextResponse.json({ error: "Could not read this file - is it a valid .xlsx?" }, { status: 400 });
  }

  const db = supabaseAdmin();

  const emails = parsed.valid.map((r) => r.email);
  const alreadyImported: string[] = [];
  const readyToImport: typeof parsed.valid = [];

  if (emails.length > 0) {
    const { data: existingCandidates } = await db.from("candidates").select("id, email").in("email", emails);
    const candidateByEmail = new Map((existingCandidates || []).map((c) => [c.email, c.id]));

    const existingCandidateIds = [...candidateByEmail.values()];
    let invitedCandidateIds = new Set<string>();

    if (existingCandidateIds.length > 0) {
      const { data: existingInvites } = await db
        .from("assessment_invites")
        .select("candidate_id")
        .eq("assessment_id", assessmentId)
        .in("candidate_id", existingCandidateIds);
      invitedCandidateIds = new Set((existingInvites || []).map((i) => i.candidate_id));
    }

    for (const row of parsed.valid) {
      const candidateId = candidateByEmail.get(row.email);
      if (candidateId && invitedCandidateIds.has(candidateId)) {
        alreadyImported.push(row.email);
      } else {
        readyToImport.push(row);
      }
    }
  }

  return NextResponse.json({
    readyToImport,
    alreadyImported,
    invalidEmail: parsed.invalidEmail,
    duplicatesInFile: parsed.duplicatesInFile,
    totalRows: parsed.valid.length + parsed.invalidEmail.length + parsed.duplicatesInFile.length,
  });
}
