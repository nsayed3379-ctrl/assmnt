import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { requireAdminRole } from "@/lib/auth";
import { sendInvitationBatch } from "@/lib/email";
import { logAudit } from "@/lib/audit";

export async function POST(req: NextRequest) {
  const session = await requireAdminRole(["super_admin", "hr"]);
  if (!session) return NextResponse.json({ error: "Not authorized." }, { status: 401 });

  const { assessmentId, inviteIds } = await req.json().catch(() => ({}));
  if (!assessmentId) return NextResponse.json({ error: "Missing assessment." }, { status: 400 });

  const db = supabaseAdmin();

  const { data: assessment } = await db
    .from("assessments")
    .select("title, duration_minutes, hard_deadline")
    .eq("id", assessmentId)
    .single();

  if (!assessment) return NextResponse.json({ error: "Assessment not found." }, { status: 404 });

  let query = db
    .from("assessment_invites")
    .select("id, candidate_id, access_code_last4, access_code_encrypted, status")
    .eq("assessment_id", assessmentId)
    .eq("status", "invited"); // only ones that haven't been opened yet

  if (Array.isArray(inviteIds) && inviteIds.length > 0) {
    query = query.in("id", inviteIds);
  }

  const { data: invites } = await query;
  if (!invites || invites.length === 0) {
    return NextResponse.json({ sent: 0, failed: 0, message: "No pending invitations to send." });
  }

  // Every invite gets a code the moment it's created (see import/confirm),
  // so normally this just resends the EXISTING code - it must never
  // silently swap a candidate's real code out from under them. A fresh
  // code is only generated for the rare case where one is somehow still
  // missing. Deliberately regenerating an existing code is a separate,
  // explicit action ("Set a fixed code" on the candidate page), not this.
  const { generateAccessCode, hashAccessCode, accessCodeLast4, encryptAccessCode, decryptAccessCode } = await import(
    "@/lib/codes"
  );

  const candidateIds = invites.map((i) => i.candidate_id);
  const { data: candidates } = await db.from("candidates").select("id, email, full_name").in("id", candidateIds);
  const candidateById = new Map((candidates || []).map((c) => [c.id, c]));

  const plainCodes = new Map<string, string>();
  for (const invite of invites) {
    let code: string | null = null;
    if (invite.access_code_encrypted) {
      try {
        code = decryptAccessCode(invite.access_code_encrypted);
      } catch {
        code = null; // fall through and issue a fresh one
      }
    }

    if (!code) {
      code = generateAccessCode();
      await db
        .from("assessment_invites")
        .update({
          access_code_hash: await hashAccessCode(code),
          access_code_last4: accessCodeLast4(code),
          access_code_encrypted: encryptAccessCode(code),
        })
        .eq("id", invite.id);
    }

    plainCodes.set(invite.id, code);
  }

  const emailInputs = invites
    .map((invite) => {
      const candidate = candidateById.get(invite.candidate_id);
      if (!candidate) return null;
      return {
        inviteId: invite.id,
        to: candidate.email,
        fullName: candidate.full_name,
        positionTitle: assessment.title,
        accessCode: plainCodes.get(invite.id)!,
        durationMinutes: assessment.duration_minutes,
        hardDeadline: assessment.hard_deadline,
      };
    })
    .filter((x): x is NonNullable<typeof x> => x !== null);

  const results = await sendInvitationBatch(emailInputs);

  let sent = 0;
  let failed = 0;
  for (let i = 0; i < emailInputs.length; i++) {
    const input = emailInputs[i];
    const result = results.find((r) => r.to === input.to);
    const ok = Boolean(result?.id);
    ok ? sent++ : failed++;

    await db.from("email_logs").insert({
      invite_id: input.inviteId,
      type: "invitation",
      provider: "resend",
      recipient: input.to,
      status: ok ? "sent" : "failed",
      provider_message_id: result?.id ?? null,
      error_message: result?.error ?? null,
    });
  }

  await logAudit("admin", session.email, "invitations_sent", assessmentId, { sent, failed });

  // codesGenerated: count of invites that now have a confirmed code
  // (existing or freshly made) - lets the caller distinguish "the code is
  // ready but the email failed to send" (still useful - it's viewable in
  // the admin panel) from "nothing happened at all".
  return NextResponse.json({ sent, failed, codesGenerated: invites.length });
}
