import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { verifyPassword } from "@/lib/codes";
import { createAdminSessionToken, getAdminCookieName } from "@/lib/auth";
import { logAudit } from "@/lib/audit";

const MAX_ATTEMPTS = 8;
const WINDOW_MINUTES = 15;

function clientIp(req: NextRequest) {
  return req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
}

export async function POST(req: NextRequest) {
  const db = supabaseAdmin();
  const ip = clientIp(req);
  const since = new Date(Date.now() - WINDOW_MINUTES * 60 * 1000).toISOString();

  // Counted before the credential check, so this also rate-limits
  // successful logins from the same IP - a deliberate simple trade-off
  // (per-IP, not per-account) that stops credential-stuffing regardless of
  // whether the attacker has a valid email. Fails open (skips rate
  // limiting rather than blocking every login) if admin_login_attempts
  // itself errors - e.g. migration 0004 not run yet - since a broken
  // rate-limit table should never be able to lock every admin out.
  try {
    const { count, error: countError } = await db
      .from("admin_login_attempts")
      .select("id", { count: "exact", head: true })
      .eq("ip", ip)
      .gte("attempted_at", since);
    if (countError) throw countError;

    if ((count || 0) >= MAX_ATTEMPTS) {
      return NextResponse.json({ error: "Too many attempts. Try again in a few minutes." }, { status: 429 });
    }

    await db.from("admin_login_attempts").insert({ ip });
  } catch (err) {
    console.error("admin login rate-limit check failed, continuing without it", err);
  }

  const { email, password } = await req.json().catch(() => ({ email: "", password: "" }));

  if (!email || !password) {
    return NextResponse.json({ error: "Email and password are required." }, { status: 400 });
  }

  const { data: admin, error } = await db
    .from("admins")
    .select("id, email, password_hash, role, is_active")
    .eq("email", String(email).trim().toLowerCase())
    .single();

  if (error || !admin || !admin.is_active) {
    return NextResponse.json({ error: "Incorrect email or password." }, { status: 401 });
  }

  const ok = await verifyPassword(password, admin.password_hash);
  if (!ok) {
    await logAudit("admin", admin.email, "login_failed");
    return NextResponse.json({ error: "Incorrect email or password." }, { status: 401 });
  }

  const token = createAdminSessionToken({ id: admin.id, email: admin.email, role: admin.role });
  await logAudit("admin", admin.email, "login_success");

  const res = NextResponse.json({ ok: true, role: admin.role });
  res.cookies.set(getAdminCookieName(), token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 12,
  });
  return res;
}
