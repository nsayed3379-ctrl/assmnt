import Link from "next/link";
import { redirect } from "next/navigation";
import { requireAdminRole } from "@/lib/auth";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { DEFAULT_INVITATION_BODY, DEFAULT_INVITATION_SUBJECT } from "@/lib/emailTemplate";
import EmailTemplateEditor from "./email-template-editor";

export const dynamic = "force-dynamic";

export default async function EmailTemplatePage() {
  const session = await requireAdminRole(["super_admin", "hr"]);
  if (!session) redirect("/admin/login");

  let subject = DEFAULT_INVITATION_SUBJECT;
  let body = DEFAULT_INVITATION_BODY;
  let migrationMissing = false;

  const { data, error } = await supabaseAdmin()
    .from("email_templates")
    .select("subject, body_markdown")
    .eq("key", "invitation")
    .maybeSingle();

  if (error) {
    migrationMissing = true;
  } else if (data) {
    subject = data.subject;
    body = data.body_markdown;
  }

  return (
    <main className="mx-auto max-w-5xl px-6 py-10">
      <Link href="/admin" className="text-sm text-slate-500 hover:text-slate-700">
        &larr; Back to dashboard
      </Link>

      <h1 className="mt-2 text-xl font-semibold text-slate-900">Invitation Email Template</h1>
      <p className="mt-1 text-sm text-slate-500">
        Preview and edit the subject and content of the invitation email. Sending stays off until you enable it
        separately - saving here only updates what would be sent once it is.
      </p>

      {migrationMissing && (
        <p className="mt-4 rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">
          The <code>email_templates</code> table doesn&apos;t exist yet, so this is showing the built-in default.
          Run <code>supabase/migrations/0003_email_templates.sql</code> in the Supabase SQL editor to be able to
          save changes.
        </p>
      )}

      <div className="mt-6">
        <EmailTemplateEditor initialSubject={subject} initialBody={body} />
      </div>
    </main>
  );
}
