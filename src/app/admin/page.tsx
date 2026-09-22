import Link from "next/link";
import { redirect } from "next/navigation";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { getAdminSession } from "@/lib/auth";
import { fetchCandidateList } from "@/lib/adminData";
import { formatDateTime, formatDuration, STATUS_LABELS, STATUS_OPTIONS } from "@/lib/format";
import InviteStatusSelect from "./invite-status-select";
import AdminFilters from "./admin-filters";
import SendAllButton from "./send-all-button";
import SendMailButton from "./send-mail-button";

export const dynamic = "force-dynamic";

export default async function AdminDashboard({
  searchParams,
}: {
  searchParams: Promise<{ assessmentId?: string; status?: string; q?: string }>;
}) {
  const session = await getAdminSession();
  if (!session) redirect("/admin/login");

  const { assessmentId, status, q } = await searchParams;

  const [{ data: assessments }, rows] = await Promise.all([
    supabaseAdmin().from("assessments").select("id, title").order("created_at", { ascending: false }),
    fetchCandidateList({ assessmentId, status, search: q }),
  ]);

  const counts: Record<string, number> = {};
  for (const row of rows) counts[row.status] = (counts[row.status] || 0) + 1;

  const exportParams = new URLSearchParams();
  if (assessmentId) exportParams.set("assessmentId", assessmentId);
  if (status) exportParams.set("status", status);
  if (q) exportParams.set("q", q);

  return (
    <main className="mx-auto max-w-6xl px-6 py-10">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-slate-900">Vecosoft Assessment Dashboard</h1>
          <p className="text-sm text-slate-500">Signed in as {session.email} ({session.role})</p>
        </div>
        <div className="flex items-center gap-4">
          <SendAllButton assessmentId={assessmentId} />
          <Link href="/admin/email-template" className="text-sm font-medium text-brand hover:underline">
            Email Template
          </Link>
          <Link href="/admin/import" className="text-sm font-medium text-brand hover:underline">
            Import Candidates
          </Link>
          <a href={`/api/admin/export?${exportParams.toString()}`} className="text-sm font-medium text-brand hover:underline">
            Export CSV
          </a>
          <form action="/api/admin/logout" method="post">
            <button className="text-sm text-slate-500 hover:text-slate-700">Sign out</button>
          </form>
        </div>
      </div>

      <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <StatCard label="Total" value={rows.length} />
        <StatCard label="Submitted" value={(counts["submitted"] || 0) + (counts["under_review"] || 0)} />
        <StatCard label="Shortlisted" value={counts["shortlisted"] || 0} />
        <StatCard label="Interview" value={counts["interview"] || 0} />
      </div>

      <div className="mt-6">
        <AdminFilters
          search={q}
          assessmentId={assessmentId}
          status={status}
          assessmentOptions={[
            { value: "", label: "All assessments" },
            ...(assessments || []).map((a) => ({ value: a.id, label: a.title })),
          ]}
          statusOptions={[
            { value: "", label: "All statuses" },
            ...STATUS_OPTIONS.map((s) => ({ value: s, label: STATUS_LABELS[s] })),
          ]}
        />
      </div>

      <div className="mt-4 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <table className="min-w-full divide-y divide-slate-100 text-sm">
          <thead className="bg-slate-50 text-left text-xs font-medium uppercase tracking-wide text-slate-500">
            <tr>
              <th className="px-4 py-3">Candidate</th>
              <th className="px-4 py-3">Candidate ID</th>
              <th className="px-4 py-3">Access Code</th>
              <th className="px-4 py-3">Assessment</th>
              <th className="px-4 py-3">Duration</th>
              <th className="px-4 py-3">Score</th>
              <th className="px-4 py-3">Integrity</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {rows.length === 0 && (
              <tr>
                <td colSpan={9} className="px-4 py-8 text-center text-slate-400">
                  No candidates yet.
                </td>
              </tr>
            )}
            {rows.map((row) => (
              <tr key={row.inviteId} className="hover:bg-slate-50">
                <td className="px-4 py-3">
                  <Link href={`/admin/candidates/${row.inviteId}`} className="font-medium text-slate-900 hover:underline">
                    {row.fullName || row.email}
                  </Link>
                  {row.fullName && <div className="text-xs text-slate-400">{row.email}</div>}
                </td>
                <td className="px-4 py-3">
                  <span title={row.inviteId} className="font-mono text-xs text-slate-500">
                    {row.inviteId.slice(0, 8)}
                  </span>
                </td>
                <td className="px-4 py-3">
                  {row.accessCodeLast4 ? (
                    <span className="font-mono text-xs text-slate-500">···{row.accessCodeLast4}</span>
                  ) : (
                    <span className="text-slate-300">-</span>
                  )}
                </td>
                <td className="px-4 py-3 text-slate-600">{row.assessmentTitle}</td>
                <td className="px-4 py-3 text-slate-600">{formatDuration(row.startedAt, row.submittedAt)}</td>
                <td className="px-4 py-3 text-slate-600">
                  {row.scoreMax ? `${row.scoreEarned}/${row.scoreMax}` : "-"}
                </td>
                <td className="px-4 py-3">
                  {row.integrityFlags > 0 ? (
                    <span className="text-amber-600">⚠ {row.integrityFlags}</span>
                  ) : (
                    <span className="text-slate-300">-</span>
                  )}
                </td>
                <td className="px-4 py-3">
                  <InviteStatusSelect inviteId={row.inviteId} status={row.status} />
                </td>
                <td className="px-4 py-3">
                  {row.status === "invited" ? (
                    <SendMailButton assessmentId={row.assessmentId} inviteId={row.inviteId} />
                  ) : (
                    <span className="text-slate-300">-</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </main>
  );
}

function StatCard({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4">
      <p className="text-2xl font-semibold text-slate-900">{value}</p>
      <p className="text-xs text-slate-500">{label}</p>
    </div>
  );
}
