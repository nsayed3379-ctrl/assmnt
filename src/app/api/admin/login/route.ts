import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { verifyPassword } from "@/lib/codes";
import { createAdminSessionToken, getAdminCookieName } from "@/lib/auth";
import { logAudit } from "@/lib/audit";

export async function POST(req: NextRequest) {
  const { email, password } = await req.json().catch(() => ({ email: "", password: "" }));

  if (!email || !password) {
    return NextResponse.json({ error: "Email and password are required." }, { status: 400 });
  }

  const { data: admin, error } = await supabaseAdmin()
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
