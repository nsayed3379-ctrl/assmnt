import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { requireActiveInvite } from "@/lib/candidateGuard";

export async function POST(req: NextRequest) {
  const ctx = await requireActiveInvite();
  if ("error" in ctx) return NextResponse.json({ error: ctx.error }, { status: ctx.status });

  const { taskId, submissionType, content, githubUrl, liveUrl } = await req.json().catch(() => ({}));
  if (!taskId || !submissionType) {
    return NextResponse.json({ error: "Missing task." }, { status: 400 });
  }

  const db = supabaseAdmin();

  const { data: task } = await db
    .from("assessment_tasks")
    .select("id, assessment_id")
    .eq("id", taskId)
    .single();

  if (!task || task.assessment_id !== ctx.invite.assessment_id) {
    return NextResponse.json({ error: "Task not found for this assessment." }, { status: 404 });
  }

  const now = new Date().toISOString();
  const payload = {
    invite_id: ctx.invite.id,
    task_id: taskId,
    submission_type: submissionType,
    content: content ?? null,
    github_url: githubUrl ?? null,
    live_url: liveUrl ?? null,
    last_saved_at: now,
  };

  const { data: saved, error } = await db
    .from("submissions")
    .upsert(payload, { onConflict: "invite_id,task_id" })
    .select("id")
    .single();

  if (error || !saved) {
    console.error("draft save error", error);
    return NextResponse.json({ error: "Could not save draft." }, { status: 500 });
  }

  await db.from("submission_versions").insert({
    submission_id: saved.id,
    snapshot: { content: content ?? null, githubUrl: githubUrl ?? null, liveUrl: liveUrl ?? null, savedAt: now },
  });

  return NextResponse.json({ ok: true, savedAt: now });
}
