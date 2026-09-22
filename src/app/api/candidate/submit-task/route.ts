import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { requireActiveInvite } from "@/lib/candidateGuard";
import type { TaskField, TaskType } from "@/lib/database.types";

type SubmissionFields = { content: string | null; file_path: string | null; github_url: string | null; live_url: string | null };

function hasValueFor(type: TaskType, s: SubmissionFields): boolean {
  switch (type) {
    case "github_url":
      return !!s.github_url?.trim();
    case "link_submission":
      return !!s.live_url?.trim();
    case "file_upload":
      return !!s.file_path;
    default:
      return !!s.content?.trim();
  }
}

export async function POST(req: NextRequest) {
  const ctx = await requireActiveInvite();
  if ("error" in ctx) return NextResponse.json({ error: ctx.error }, { status: ctx.status });

  const { taskId } = await req.json().catch(() => ({}));
  if (!taskId) return NextResponse.json({ error: "Missing task." }, { status: 400 });

  const db = supabaseAdmin();

  const { data: task } = await db.from("assessment_tasks").select("task_type, fields").eq("id", taskId).single();
  if (!task) return NextResponse.json({ error: "Task not found." }, { status: 404 });

  const { data: submission } = await db
    .from("submissions")
    .select("id, submission_type, content, file_path, github_url, live_url")
    .eq("invite_id", ctx.invite.id)
    .eq("task_id", taskId)
    .single();

  const multiField = (task.fields as TaskField[] | null) || null;

  const missing =
    multiField && multiField.length > 0
      ? multiField.filter((f) => f.required && !(submission && hasValueFor(f.type, submission)))
      : [];

  const hasContent =
    multiField && multiField.length > 0
      ? missing.length === 0
      : Boolean(submission && hasValueFor(task.task_type, submission));

  if (!hasContent) {
    const detail = missing.length > 0 ? ` Still needed: ${missing.map((f) => f.label).join(", ")}.` : "";
    return NextResponse.json({ error: `Add your work before marking this task complete.${detail}` }, { status: 400 });
  }

  const { error } = await db
    .from("submissions")
    .update({ status: "submitted", submitted_at: new Date().toISOString() })
    .eq("id", submission!.id);

  if (error) return NextResponse.json({ error: "Could not mark task complete." }, { status: 500 });

  return NextResponse.json({ ok: true });
}
