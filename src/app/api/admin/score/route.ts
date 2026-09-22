import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { requireAdminRole } from "@/lib/auth";
import { logAudit } from "@/lib/audit";

export async function POST(req: NextRequest) {
  const session = await requireAdminRole(["super_admin", "hr", "reviewer"]);
  if (!session) return NextResponse.json({ error: "Not authorized." }, { status: 401 });

  const { submissionId, score, maxScore, comment } = await req.json().catch(() => ({}));
  if (!submissionId || typeof score !== "number" || typeof maxScore !== "number") {
    return NextResponse.json({ error: "Invalid score." }, { status: 400 });
  }
  if (score < 0 || score > maxScore) {
    return NextResponse.json({ error: `Score must be between 0 and ${maxScore}.` }, { status: 400 });
  }

  const db = supabaseAdmin();

  const { data: existing } = await db
    .from("evaluation_scores")
    .select("id")
    .eq("submission_id", submissionId)
    .eq("reviewer_id", session.id)
    .eq("criterion", "Overall")
    .maybeSingle();

  if (existing) {
    const { error } = await db
      .from("evaluation_scores")
      .update({ score, max_score: maxScore, comment: comment ?? null })
      .eq("id", existing.id);
    if (error) return NextResponse.json({ error: "Could not save score." }, { status: 500 });
  } else {
    const { error } = await db.from("evaluation_scores").insert({
      submission_id: submissionId,
      reviewer_id: session.id,
      criterion: "Overall",
      score,
      max_score: maxScore,
      comment: comment ?? null,
    });
    if (error) return NextResponse.json({ error: "Could not save score." }, { status: 500 });
  }

  await logAudit("admin", session.email, "score_saved", submissionId, { score, maxScore });

  return NextResponse.json({ ok: true });
}
