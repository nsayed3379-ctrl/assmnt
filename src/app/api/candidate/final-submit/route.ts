import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { requireActiveInvite } from "@/lib/candidateGuard";
import { logAudit } from "@/lib/audit";

export async function POST() {
  const ctx = await requireActiveInvite({ enforceExpiry: false });
  if ("error" in ctx) return NextResponse.json({ error: ctx.error }, { status: ctx.status });

  const db = supabaseAdmin();
  const now = new Date().toISOString();

  // Any tasks still sitting as drafts get finalized along with everything
  // else - the candidate was told drafts left as-is will be included.
  await db
    .from("submissions")
    .update({ status: "submitted", submitted_at: now })
    .eq("invite_id", ctx.invite.id)
    .eq("status", "draft");

  const { data: invite } = await db.from("assessment_invites").select("status").eq("id", ctx.invite.id).single();

  const { error } = await db
    .from("assessment_invites")
    .update({ submitted_at: now, status: "submitted" })
    .eq("id", ctx.invite.id);

  if (error) {
    return NextResponse.json({ error: "Could not submit. Please try again." }, { status: 500 });
  }

  await db.from("candidate_status_history").insert({
    invite_id: ctx.invite.id,
    from_status: invite?.status ?? null,
    to_status: "submitted",
    changed_by: "system",
  });
  await logAudit("candidate", ctx.session.email, "final_submit", ctx.invite.id);

  return NextResponse.json({ ok: true });
}
