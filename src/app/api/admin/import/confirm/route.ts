import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { requireAdminRole } from "@/lib/auth";
import { generateAccessCode, hashAccessCode, accessCodeLast4, encryptAccessCode } from "@/lib/codes";
import { logAudit } from "@/lib/audit";

type Row = { email: string; fullName: string | null; position: string | null };

export async function POST(req: NextRequest) {
  const session = await requireAdminRole(["super_admin", "hr"]);
  if (!session) return NextResponse.json({ error: "Not authorized." }, { status: 401 });

  const { assessmentId, rows } = (await req.json().catch(() => ({}))) as { assessmentId?: string; rows?: Row[] };

  if (!assessmentId || !Array.isArray(rows) || rows.length === 0) {
    return NextResponse.json({ error: "Nothing to import." }, { status: 400 });
  }

  const db = supabaseAdmin();
  let imported = 0;
  const failures: { email: string; reason: string }[] = [];

  for (const row of rows) {
    try {
      let candidateId: string;
      const { data: existing } = await db.from("candidates").select("id, full_name").eq("email", row.email).single();

      if (existing) {
        candidateId = existing.id;
        if (!existing.full_name && row.fullName) {
          await db.from("candidates").update({ full_name: row.fullName }).eq("id", candidateId);
        }
      } else {
        const { data: created, error: createError } = await db
          .from("candidates")
          .insert({ email: row.email, full_name: row.fullName })
          .select("id")
          .single();
        if (createError || !created) throw new Error(createError?.message || "Could not create candidate.");
        candidateId = created.id;
      }

      const { data: existingInvite } = await db
        .from("assessment_invites")
        .select("id")
        .eq("candidate_id", candidateId)
        .eq("assessment_id", assessmentId)
        .maybeSingle();

      if (existingInvite) {
        failures.push({ email: row.email, reason: "Already invited to this assessment." });
        continue;
      }

      const code = generateAccessCode();
      const { error: inviteError } = await db.from("assessment_invites").insert({
        candidate_id: candidateId,
        assessment_id: assessmentId,
        access_code_hash: await hashAccessCode(code),
        access_code_last4: accessCodeLast4(code),
        access_code_encrypted: encryptAccessCode(code),
        status: "invited",
      });

      if (inviteError) throw new Error(inviteError.message);
      imported++;
    } catch (err: any) {
      failures.push({ email: row.email, reason: err?.message || "Unknown error" });
    }
  }

  await logAudit("admin", session.email, "candidates_imported", assessmentId, { imported, failed: failures.length });

  return NextResponse.json({ imported, failures });
}
