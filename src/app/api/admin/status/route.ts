import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { isAdminRequestAuthed } from "@/lib/auth";

const ALLOWED = ["in_progress", "review", "shortlist", "rejected"];

export async function POST(req: NextRequest) {
  if (!(await isAdminRequestAuthed())) {
    return NextResponse.json({ error: "Not authorized." }, { status: 401 });
  }

  const { id, status } = await req.json().catch(() => ({}));
  if (!id || !ALLOWED.includes(status)) {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }

  const { error } = await supabaseAdmin().from("assessments").update({ status }).eq("id", id);
  if (error) {
    console.error(error);
    return NextResponse.json({ error: "Could not update status." }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
