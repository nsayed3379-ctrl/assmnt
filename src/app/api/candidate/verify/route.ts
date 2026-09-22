import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { verifyAccessCode } from "@/lib/codes";
import { createCandidateSessionToken, getCandidateCookieName } from "@/lib/candidateAuth";
import { logAudit } from "@/lib/audit";

const MAX_ATTEMPTS = 5;
const LOCK_MINUTES = 15;
const GENERIC_ERROR = "Invalid email or access code.";

export async function POST(req: NextRequest) {
  const { email, code } = await req.json().catch(() => ({ email: "", code: "" }));
  const normalizedEmail = String(email || "").trim().toLowerCase();

  if (!normalizedEmail || !code) {
    return NextResponse.json({ error: "Email and access code are required." }, { status: 400 });
  }

  const db = supabaseAdmin();

  const { data: candidate } = await db
    .from("candidates")
    .select("id, email, full_name")
    .eq("email", normalizedEmail)
    .single();

  if (!candidate) {
    return NextResponse.json({ error: GENERIC_ERROR }, { status: 401 });
  }

  // A candidate is assumed to have one active invite at a time in Phase 1;
  // the schema supports more per candidate for a future multi-assessment flow.
  const { data: invite } = await db
    .from("assessment_invites")
    .select("id, status, failed_attempts, locked_until, access_code_hash, submitted_at, assessment_id")
    .eq("candidate_id", candidate.id)
    .order("invited_at", { ascending: false })
    .limit(1)
    .single();

  if (!invite) {
    return NextResponse.json({ error: GENERIC_ERROR }, { status: 401 });
  }

  if (invite.locked_until && new Date(invite.locked_until).getTime() > Date.now()) {
    const minutesLeft = Math.ceil((new Date(invite.locked_until).getTime() - Date.now()) / 60000);
    return NextResponse.json(
      { error: `Too many failed attempts. Please try again in ${minutesLeft} minute(s).` },
      { status: 423 }
    );
  }

  const codeMatches = await verifyAccessCode(String(code), invite.access_code_hash);

  if (!codeMatches) {
    const nextAttempts = invite.failed_attempts + 1;
    const shouldLock = nextAttempts >= MAX_ATTEMPTS;

    await db
      .from("assessment_invites")
      .update({
        failed_attempts: shouldLock ? 0 : nextAttempts,
        locked_until: shouldLock ? new Date(Date.now() + LOCK_MINUTES * 60 * 1000).toISOString() : null,
      })
      .eq("id", invite.id);

    await logAudit("candidate", normalizedEmail, "login_failed", invite.id);

    if (shouldLock) {
      return NextResponse.json(
        { error: `Too many failed attempts. Please try again in ${LOCK_MINUTES} minutes.` },
        { status: 423 }
      );
    }

    return NextResponse.json(
      { error: `${GENERIC_ERROR} (${MAX_ATTEMPTS - nextAttempts} attempt(s) remaining)` },
      { status: 401 }
    );
  }

  const updates: Partial<import("@/lib/database.types").AssessmentInviteRow> = {
    failed_attempts: 0,
    locked_until: null,
  };
  if (invite.status === "invited") updates.status = "opened";
  await db.from("assessment_invites").update(updates).eq("id", invite.id);

  const token = createCandidateSessionToken({
    inviteId: invite.id,
    candidateId: candidate.id,
    email: candidate.email,
  });

  await logAudit("candidate", normalizedEmail, "login_success", invite.id);

  const res = NextResponse.json({ ok: true, needsName: !candidate.full_name });
  res.cookies.set(getCandidateCookieName(), token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24,
  });
  return res;
}
