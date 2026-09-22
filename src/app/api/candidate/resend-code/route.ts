import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { sendResendCodeEmail } from "@/lib/email";
import { logAudit } from "@/lib/audit";

// Deliberately always returns { ok: true } regardless of whether the email
// matched anything - this endpoint must not reveal which emails are in the
// system (that would let someone enumerate the candidate list).
export async function POST(req: NextRequest) {
  const { email } = await req.json().catch(() => ({ email: "" }));
  const normalizedEmail = String(email || "").trim().toLowerCase();

  if (normalizedEmail) {
    try {
      const db = supabaseAdmin();
      const { data: candidate } = await db.from("candidates").select("id, email").eq("email", normalizedEmail).single();

      if (candidate) {
        const { data: invite } = await db
          .from("assessment_invites")
          .select("id")
          .eq("candidate_id", candidate.id)
          .order("invited_at", { ascending: false })
          .limit(1)
          .single();

        // Login only ever checks access_code_hash (one-way), so a resend
        // always regenerates a fresh code and invalidates the old one -
        // there's nothing to "recover". access_code_encrypted is updated
        // alongside purely so admins can look the current code up later.
        if (invite) {
          const { generateAccessCode, hashAccessCode, accessCodeLast4, encryptAccessCode } = await import("@/lib/codes");
          const newCode = generateAccessCode();
          await db
            .from("assessment_invites")
            .update({
              access_code_hash: await hashAccessCode(newCode),
              access_code_last4: accessCodeLast4(newCode),
              access_code_encrypted: encryptAccessCode(newCode),
              failed_attempts: 0,
              locked_until: null,
            })
            .eq("id", invite.id);

          const { error } = await sendResendCodeEmail(candidate.email, newCode);
          await db.from("email_logs").insert({
            invite_id: invite.id,
            type: "resend_code",
            provider: "resend",
            recipient: candidate.email,
            status: error ? "failed" : "sent",
            error_message: error?.message ?? null,
          });
          await logAudit("candidate", normalizedEmail, "resend_code_requested", invite.id);
        }
      }
    } catch (err) {
      console.error("resend-code error", err);
    }
  }

  return NextResponse.json({ ok: true });
}
