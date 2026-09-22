import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { requireAdminRole } from "@/lib/auth";
import { hashAccessCode, accessCodeLast4, encryptAccessCode } from "@/lib/codes";
import { logAudit } from "@/lib/audit";

// Lets an admin set a candidate's access code directly, instead of going
// through generate-and-email (which depends on RESEND_API_KEY being
// configured). Same storage as every other code path: hashed for login,
// encrypted for admin viewing - nothing new here except where the plain
// code comes from.
export async function POST(req: NextRequest) {
  const session = await requireAdminRole(["super_admin", "hr"]);
  if (!session) return NextResponse.json({ error: "Not authorized." }, { status: 401 });

  const { inviteId, code } = await req.json().catch(() => ({}));
  const trimmed = String(code || "").trim();

  if (!inviteId || !trimmed) {
    return NextResponse.json({ error: "Missing invite or code." }, { status: 400 });
  }
  if (trimmed.length < 6) {
    return NextResponse.json({ error: "Code must be at least 6 characters." }, { status: 400 });
  }

  const db = supabaseAdmin();

  const { data: invite } = await db.from("assessment_invites").select("id, status").eq("id", inviteId).single();
  if (!invite) return NextResponse.json({ error: "Candidate invite not found." }, { status: 404 });

  // Same guard as regenerate: changing the code out from under a candidate
  // who has already started could lock them out mid-assessment.
  if (invite.status !== "invited") {
    return NextResponse.json(
      { error: `Can't change the code once status is "${invite.status}" - it may already be in use.` },
      { status: 409 }
    );
  }

  const { error } = await db
    .from("assessment_invites")
    .update({
      access_code_hash: await hashAccessCode(trimmed),
      access_code_last4: accessCodeLast4(trimmed),
      access_code_encrypted: encryptAccessCode(trimmed),
      failed_attempts: 0,
      locked_until: null,
    })
    .eq("id", inviteId);

  if (error) return NextResponse.json({ error: "Could not set the code." }, { status: 500 });

  await logAudit("admin", session.email, "access_code_set_manually", inviteId);

  return NextResponse.json({ ok: true });
}
