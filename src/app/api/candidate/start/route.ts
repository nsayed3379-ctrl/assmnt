import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { getCandidateSession } from "@/lib/candidateAuth";
import { computeExpiresAt } from "@/lib/timer";
import { logAudit } from "@/lib/audit";

export async function POST() {
  const session = await getCandidateSession();
  if (!session) return NextResponse.json({ error: "Not authorized." }, { status: 401 });

  const db = supabaseAdmin();

  const { data: invite, error: fetchError } = await db
    .from("assessment_invites")
    .select("id, started_at, submitted_at, assessment_id, status")
    .eq("id", session.inviteId)
    .single();

  if (fetchError || !invite) {
    return NextResponse.json({ error: "Assessment not found." }, { status: 404 });
  }

  if (invite.submitted_at) {
    return NextResponse.json({ error: "This assessment has already been submitted." }, { status: 409 });
  }

  // Idempotent: if already started, just return the existing timing instead
  // of resetting the clock (a page refresh must never restart the timer).
  if (invite.started_at) {
    return NextResponse.json({ ok: true, alreadyStarted: true });
  }

  const { data: assessment } = await db
    .from("assessments")
    .select("duration_minutes, hard_deadline")
    .eq("id", invite.assessment_id)
    .single();

  if (!assessment) {
    return NextResponse.json({ error: "Assessment configuration not found." }, { status: 500 });
  }

  const startedAt = new Date();
  const expiresAt = computeExpiresAt(startedAt, assessment.duration_minutes, assessment.hard_deadline);

  const { error: updateError } = await db
    .from("assessment_invites")
    .update({
      started_at: startedAt.toISOString(),
      expires_at: expiresAt.toISOString(),
      status: "in_progress",
    })
    .eq("id", invite.id);

  if (updateError) {
    return NextResponse.json({ error: "Could not start the assessment." }, { status: 500 });
  }

  await db.from("candidate_status_history").insert({
    invite_id: invite.id,
    from_status: invite.status,
    to_status: "in_progress",
    changed_by: "system",
  });
  await logAudit("candidate", session.email, "assessment_started", invite.id);

  return NextResponse.json({ ok: true });
}
