import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { getCandidateSession } from "@/lib/candidateAuth";

const ALLOWED_EVENTS = ["copy_attempt", "right_click_attempt", "tab_switch", "devtools_suspected"];

// Best-effort, fire-and-forget signal - never blocks the candidate's work,
// so failures here are swallowed rather than surfaced.
export async function POST(req: NextRequest) {
  try {
    const session = await getCandidateSession();
    if (!session) return NextResponse.json({ ok: true });

    const { taskId, eventType } = await req.json().catch(() => ({}));
    if (!ALLOWED_EVENTS.includes(eventType)) return NextResponse.json({ ok: true });

    await supabaseAdmin()
      .from("integrity_events")
      .insert({ invite_id: session.inviteId, task_id: taskId || null, event_type: eventType });
  } catch (err) {
    console.error("integrity log failed", err);
  }
  return NextResponse.json({ ok: true });
}
