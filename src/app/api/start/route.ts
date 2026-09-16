import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { getTask } from "@/lib/tasks";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const email = (body.email || "").trim();
    const fullName = (body.fullName || "").trim() || null;
    const position = (body.position || "").trim();

    if (!email || !email.includes("@")) {
      return NextResponse.json({ error: "A valid email is required." }, { status: 400 });
    }

    const task = getTask(position);

    // started_at is intentionally NOT taken from the client. It defaults to
    // now() in the database, so the clock that matters is the server's.
    const { data, error } = await supabaseAdmin()
      .from("assessments")
      .insert({
        email,
        full_name: fullName,
        position: task.position,
        duration_minutes: task.durationMinutes,
        status: "in_progress",
      })
      .select("id")
      .single();

    if (error || !data) {
      console.error("start error", error);
      return NextResponse.json({ error: "Could not start the assessment." }, { status: 500 });
    }

    return NextResponse.json({ id: data.id });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Unexpected error." }, { status: 500 });
  }
}
