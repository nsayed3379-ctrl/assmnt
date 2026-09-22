import { redirect } from "next/navigation";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { getCandidateSession } from "@/lib/candidateAuth";
import SetNameForm from "./set-name-form";

export const dynamic = "force-dynamic";

export default async function SetNamePage() {
  const session = await getCandidateSession();
  if (!session) redirect("/assessment/login");

  const { data: candidate } = await supabaseAdmin()
    .from("candidates")
    .select("full_name")
    .eq("id", session.candidateId)
    .single();

  if (candidate?.full_name) redirect("/assessment/dashboard");

  return (
    <main className="mx-auto flex min-h-screen max-w-sm flex-col justify-center px-6">
      <div className="rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
        <h1 className="text-lg font-semibold text-slate-900">One last thing</h1>
        <p className="mt-1 text-sm text-slate-500">What's your full name? We'll use this on your assessment record.</p>
        <SetNameForm />
      </div>
    </main>
  );
}
