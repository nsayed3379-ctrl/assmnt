import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { requireAdminRole } from "@/lib/auth";
import { STATUS_OPTIONS } from "@/lib/format";
import { logAudit } from "@/lib/audit";

export async function POST(req: NextRequest) {
  const session = await requireAdminRole(["super_admin", "hr", "reviewer"]);
  if (!session) return NextResponse.json({ error: "Not authorized." }, { status: 401 });

  const { inviteId, status } = await req.json().catch(() => ({}));
  if (!inviteId || !STATUS_OPTIONS.includes(status)) {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }

  const db = supabaseAdmin();
  const { data: current } = await db.from("assessment_invites").select("status").eq("id", inviteId).single();

  const { error } = await db.from("assessment_invites").update({ status }).eq("id", inviteId);
  if (error) {
    return NextResponse.json({ error: "Could not update status." }, { status: 500 });
  }

  await db.from("candidate_status_history").insert({
    invite_id: inviteId,
    from_status: current?.status ?? null,
    to_status: status,
    changed_by: session.email,
  });
  await logAudit("admin", session.email, "status_changed", inviteId, { to: status });

  return NextResponse.json({ ok: true });
}
