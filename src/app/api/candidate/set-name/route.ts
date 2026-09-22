import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { getCandidateSession } from "@/lib/candidateAuth";

export async function POST(req: NextRequest) {
  const session = await getCandidateSession();
  if (!session) return NextResponse.json({ error: "Not authorized." }, { status: 401 });

  const { fullName } = await req.json().catch(() => ({ fullName: "" }));
  const trimmed = String(fullName || "").trim();
  if (!trimmed || trimmed.length < 2) {
    return NextResponse.json({ error: "Please enter your full name." }, { status: 400 });
  }

  const { error } = await supabaseAdmin()
    .from("candidates")
    .update({ full_name: trimmed })
    .eq("id", session.candidateId);

  if (error) {
    return NextResponse.json({ error: "Could not save your name." }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
