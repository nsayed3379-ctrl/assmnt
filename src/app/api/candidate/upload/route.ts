import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin, SUBMISSIONS_BUCKET } from "@/lib/supabaseAdmin";
import { requireActiveInvite } from "@/lib/candidateGuard";

export const runtime = "nodejs";

const MAX_BYTES = 25 * 1024 * 1024; // 25 MB

export async function POST(req: NextRequest) {
  const ctx = await requireActiveInvite();
  if ("error" in ctx) return NextResponse.json({ error: ctx.error }, { status: ctx.status });

  const form = await req.formData();
  const taskId = String(form.get("taskId") || "");
  const file = form.get("file") as File | null;

  if (!taskId || !file || file.size === 0) {
    return NextResponse.json({ error: "Select a file to upload." }, { status: 400 });
  }
  if (file.size > MAX_BYTES) {
    return NextResponse.json({ error: "File is too large (25 MB max)." }, { status: 400 });
  }

  const db = supabaseAdmin();

  const { data: task } = await db.from("assessment_tasks").select("id, assessment_id").eq("id", taskId).single();
  if (!task || task.assessment_id !== ctx.invite.assessment_id) {
    return NextResponse.json({ error: "Task not found for this assessment." }, { status: 404 });
  }

  // Stream the file straight into object storage as a binary buffer - never
  // written to a local/ephemeral disk in between, which is what usually
  // causes "the file got corrupted" on simpler upload setups.
  const arrayBuffer = await file.arrayBuffer();
  const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
  const path = `${ctx.invite.id}/${taskId}/${Date.now()}-${safeName}`;

  const { error: uploadError } = await db.storage.from(SUBMISSIONS_BUCKET).upload(path, Buffer.from(arrayBuffer), {
    contentType: file.type || "application/octet-stream",
    upsert: false,
  });

  if (uploadError) {
    console.error("upload error", uploadError);
    return NextResponse.json({ error: "Upload failed. Please try again." }, { status: 500 });
  }

  const now = new Date().toISOString();
  const { error: dbError } = await db.from("submissions").upsert(
    {
      invite_id: ctx.invite.id,
      task_id: taskId,
      submission_type: "file_upload",
      file_path: path,
      last_saved_at: now,
    },
    { onConflict: "invite_id,task_id" }
  );

  if (dbError) {
    return NextResponse.json({ error: "File uploaded but could not be recorded. Please retry." }, { status: 500 });
  }

  return NextResponse.json({ ok: true, fileName: file.name });
}
