import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin, SUBMISSIONS_BUCKET } from "@/lib/supabaseAdmin";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  try {
    const form = await req.formData();
    const id = String(form.get("id") || "");
    if (!id) {
      return NextResponse.json({ error: "Missing assessment id." }, { status: 400 });
    }

    const db = supabaseAdmin();

    const { data: existing, error: fetchError } = await db
      .from("assessments")
      .select("id, submitted_at")
      .eq("id", id)
      .single();

    if (fetchError || !existing) {
      return NextResponse.json({ error: "Assessment not found." }, { status: 404 });
    }

    if (existing.submitted_at) {
      return NextResponse.json({ error: "This assessment has already been submitted." }, { status: 409 });
    }

    const githubUrl = (form.get("githubUrl") as string | null)?.trim() || null;
    const figmaUrl = (form.get("figmaUrl") as string | null)?.trim() || null;
    const liveDemoUrl = (form.get("liveDemoUrl") as string | null)?.trim() || null;
    const aiUsed = form.get("aiUsed") === "true";
    const aiTools = (form.get("aiTools") as string | null)?.trim() || null;
    const notes = (form.get("notes") as string | null)?.trim() || null;
    const file = form.get("zip") as File | null;

    if (!githubUrl && !liveDemoUrl && (!file || file.size === 0)) {
      return NextResponse.json(
        { error: "Provide at least a GitHub URL, a live demo URL, or a ZIP upload." },
        { status: 400 }
      );
    }

    let zipPath: string | null = null;

    if (file && file.size > 0) {
      const MAX_BYTES = 50 * 1024 * 1024; // 50 MB
      if (file.size > MAX_BYTES) {
        return NextResponse.json({ error: "ZIP file is too large (50 MB max)." }, { status: 400 });
      }

      const arrayBuffer = await file.arrayBuffer();
      const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
      zipPath = `${id}/${Date.now()}-${safeName}`;

      const { error: uploadError } = await db.storage
        .from(SUBMISSIONS_BUCKET)
        .upload(zipPath, Buffer.from(arrayBuffer), {
          contentType: file.type || "application/zip",
          upsert: false,
        });

      if (uploadError) {
        console.error("upload error", uploadError);
        return NextResponse.json({ error: "Could not upload ZIP file." }, { status: 500 });
      }
    }

    // submitted_at is set server-side to now(); duration is derived from
    // started_at/submitted_at at display time, never from a client value.
    const { error: updateError } = await db
      .from("assessments")
      .update({
        submitted_at: new Date().toISOString(),
        github_url: githubUrl,
        figma_url: figmaUrl,
        live_demo_url: liveDemoUrl,
        zip_path: zipPath,
        ai_used: aiUsed,
        ai_tools: aiTools,
        notes,
        status: "review",
      })
      .eq("id", id);

    if (updateError) {
      console.error("submit update error", updateError);
      return NextResponse.json({ error: "Could not record submission." }, { status: 500 });
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Unexpected error." }, { status: 500 });
  }
}
