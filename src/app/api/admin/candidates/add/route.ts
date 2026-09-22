import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { requireAdminRole } from "@/lib/auth";
import { generateAccessCode, hashAccessCode, accessCodeLast4, encryptAccessCode } from "@/lib/codes";
import { logAudit } from "@/lib/audit";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export async function POST(req: NextRequest) {
  const session = await requireAdminRole(["super_admin", "hr"]);
  if (!session) return NextResponse.json({ error: "Not authorized." }, { status: 401 });

  const body = await req.json().catch(() => ({}));
  const assessmentId = String(body.assessmentId || "");
  const email = String(body.email || "").trim().toLowerCase();
  const fullName = body.fullName ? String(body.fullName).trim() : null;

  if (!assessmentId) return NextResponse.json({ error: "Choose an assessment first." }, { status: 400 });
  if (!email || !EMAIL_RE.test(email)) {
    return NextResponse.json({ error: "Enter a valid email address." }, { status: 400 });
  }

  const db = supabaseAdmin();

  const { data: assessment } = await db.from("assessments").select("id").eq("id", assessmentId).single();
  if (!assessment) return NextResponse.json({ error: "Assessment not found." }, { status: 404 });

  let candidateId: string;
  const { data: existing } = await db.from("candidates").select("id, full_name").eq("email", email).single();

  if (existing) {
    candidateId = existing.id;
    if (!existing.full_name && fullName) {
      await db.from("candidates").update({ full_name: fullName }).eq("id", candidateId);
    }
  } else {
    const { data: created, error: createError } = await db
      .from("candidates")
      .insert({ email, full_name: fullName })
      .select("id")
      .single();
    if (createError || !created) {
      return NextResponse.json({ error: createError?.message || "Could not create candidate." }, { status: 500 });
    }
    candidateId = created.id;
  }

  const { data: existingInvite } = await db
    .from("assessment_invites")
    .select("id")
    .eq("candidate_id", candidateId)
    .eq("assessment_id", assessmentId)
    .maybeSingle();

  if (existingInvite) {
    return NextResponse.json({ error: "This candidate is already invited to this assessment." }, { status: 409 });
  }

  const code = generateAccessCode();
  const { data: invite, error: inviteError } = await db
    .from("assessment_invites")
    .insert({
      candidate_id: candidateId,
      assessment_id: assessmentId,
      access_code_hash: await hashAccessCode(code),
      access_code_last4: accessCodeLast4(code),
      access_code_encrypted: encryptAccessCode(code),
      status: "invited",
    })
    .select("id")
    .single();

  if (inviteError || !invite) {
    return NextResponse.json({ error: inviteError?.message || "Could not create invite." }, { status: 500 });
  }

  await logAudit("admin", session.email, "candidate_added", assessmentId, { email });

  return NextResponse.json({ inviteId: invite.id, email, fullName, accessCode: code });
}
