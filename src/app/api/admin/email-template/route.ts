import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { requireAdminRole } from "@/lib/auth";
import { logAudit } from "@/lib/audit";

export async function POST(req: NextRequest) {
  const session = await requireAdminRole(["super_admin", "hr"]);
  if (!session) return NextResponse.json({ error: "Not authorized." }, { status: 401 });

  const body = await req.json().catch(() => ({}));
  const subject = String(body.subject || "").trim();
  const bodyMarkdown = String(body.body || "").trim();

  if (!subject || !bodyMarkdown) {
    return NextResponse.json({ error: "Subject and body are both required." }, { status: 400 });
  }

  const db = supabaseAdmin();
  const { error } = await db.from("email_templates").upsert(
    {
      key: "invitation",
      subject,
      body_markdown: bodyMarkdown,
      updated_by: session.email,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "key" }
  );

  if (error) {
    const hint = error.message.includes("does not exist")
      ? " Run supabase/migrations/0003_email_templates.sql in the Supabase SQL editor first."
      : "";
    return NextResponse.json({ error: error.message + hint }, { status: 500 });
  }

  await logAudit("admin", session.email, "email_template_updated", "invitation");

  return NextResponse.json({ ok: true });
}
