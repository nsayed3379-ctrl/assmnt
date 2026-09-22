import { redirect } from "next/navigation";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { getCandidateSession } from "@/lib/candidateAuth";
import { formatDateTime } from "@/lib/format";

export const dynamic = "force-dynamic";

export default async function CompletedPage() {
  const session = await getCandidateSession();
  if (!session) redirect("/assessment/login");

  const { data: invite } = await supabaseAdmin()
    .from("assessment_invites")
    .select("submitted_at")
    .eq("id", session.inviteId)
    .single();

  if (!invite?.submitted_at) redirect("/assessment/dashboard");

  return (
    <main className="mx-auto flex min-h-screen max-w-lg flex-col items-center justify-center px-6 text-center">
      <div className="rounded-2xl border border-slate-200 bg-white p-10 shadow-sm">
        <h1 className="text-xl font-semibold text-slate-900">Thanks - you're all set!</h1>
        <p className="mt-2 text-sm text-slate-500">
          Your assessment was submitted successfully on {formatDateTime(invite.submitted_at)}.
        </p>
        <p className="mt-4 text-sm text-slate-500">
          Our recruitment team will review your submission and get back to you about next steps.
        </p>
      </div>
    </main>
  );
}
