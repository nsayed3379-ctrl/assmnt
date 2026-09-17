import { NextRequest, NextResponse } from "next/server";
import { createAdminSessionToken, getAdminCookieName } from "@/lib/auth";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

const MAX_ATTEMPTS = 8;
const WINDOW_MINUTES = 15;

function clientIp(req: NextRequest) {
  return req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
}

export async function POST(req: NextRequest) {
  const ip = clientIp(req);
  const since = new Date(Date.now() - WINDOW_MINUTES * 60 * 1000).toISOString();

  const { count } = await supabaseAdmin()
    .from("admin_login_attempts")
    .select("id", { count: "exact", head: true })
    .eq("ip", ip)
    .gte("attempted_at", since);

  if ((count || 0) >= MAX_ATTEMPTS) {
    return NextResponse.json(
      { error: "Too many attempts. Try again in a few minutes." },
      { status: 429 }
    );
  }

  await supabaseAdmin().from("admin_login_attempts").insert({ ip });

  const { password } = await req.json().catch(() => ({ password: "" }));

  const expected = process.env.ADMIN_PASSWORD;
  if (!expected) {
    return NextResponse.json(
      { error: "Server is not configured (ADMIN_PASSWORD missing)." },
      { status: 500 }
    );
  }

  if (password !== expected) {
    return NextResponse.json({ error: "Incorrect password." }, { status: 401 });
  }

  const res = NextResponse.json({ ok: true });
  res.cookies.set(getAdminCookieName(), createAdminSessionToken(), {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 12, // 12 hours
  });
  return res;
}
