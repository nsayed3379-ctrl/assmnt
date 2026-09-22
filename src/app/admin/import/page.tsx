import { redirect } from "next/navigation";
import { requireAdminRole } from "@/lib/auth";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import ImportForm from "./import-form";
import AddCandidateForm from "./add-candidate-form";

export const dynamic = "force-dynamic";

export default async function ImportPage() {
  const session = await requireAdminRole(["super_admin", "hr"]);
  if (!session) redirect("/admin/login");

  const { data: assessments } = await supabaseAdmin()
    .from("assessments")
    .select("id, title, status")
    .order("created_at", { ascending: false });

  return (
    <main className="mx-auto max-w-3xl px-6 py-10">
      <h1 className="text-xl font-semibold text-slate-900">Import Shortlisted Candidates</h1>
      <p className="mt-1 text-sm text-slate-500">
        Upload an .xlsx file with an <code>email</code> column (name and position columns are optional).
      </p>

      <div className="mt-6">
        <AddCandidateForm assessments={assessments || []} />
      </div>

      <ImportForm assessments={assessments || []} />
    </main>
  );
}
