import Link from "next/link";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { formatDateTime, formatDuration } from "@/lib/format";
import StatusSelect from "./status-select";

export const dynamic = "force-dynamic";

export default async function AdminDashboard() {
  const { data, error } = await supabaseAdmin()
    .from("assessments")
    .select("id, email, full_name, position, started_at, submitted_at, github_url, status, created_at")
    .order("created_at", { ascending: false });

  const rows = data || [];

  return (
    <main className="mx-auto max-w-6xl px-6 py-10">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold text-slate-900">VecoSoft Assessment Dashboard</h1>
        <form action="/api/admin/logout" method="post">
          <button className="text-sm text-slate-500 hover:text-slate-700">Sign out</button>
        </form>
      </div>

      {error && <p className="mt-4 text-sm text-red-600">Could not load assessments.</p>}

      <div className="mt-6 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <table className="min-w-full divide-y divide-slate-100 text-sm">
          <thead className="bg-slate-50 text-left text-xs font-medium uppercase tracking-wide text-slate-500">
            <tr>
              <th className="px-4 py-3">Candidate</th>
              <th className="px-4 py-3">Position</th>
              <th className="px-4 py-3">Started</th>
              <th className="px-4 py-3">Duration</th>
              <th className="px-4 py-3">GitHub</th>
              <th className="px-4 py-3">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {rows.length === 0 && (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center text-slate-400">
                  No submissions yet.
                </td>
              </tr>
            )}
            {rows.map((row: any) => (
              <tr key={row.id} className="hover:bg-slate-50">
                <td className="px-4 py-3">
                  <Link href={`/portal-x7k2/${row.id}`} className="font-medium text-slate-900 hover:underline">
                    {row.full_name || row.email}
                  </Link>
                  {row.full_name && <div className="text-xs text-slate-400">{row.email}</div>}
                </td>
                <td className="px-4 py-3 text-slate-600">{row.position}</td>
                <td className="px-4 py-3 text-slate-600">{formatDateTime(row.started_at)}</td>
                <td className="px-4 py-3 text-slate-600">
                  {formatDuration(row.started_at, row.submitted_at)}
                </td>
                <td className="px-4 py-3">
                  {row.github_url ? (
                    <span className="text-emerald-600">&#10003;</span>
                  ) : (
                    <span className="text-slate-300">&mdash;</span>
                  )}
                </td>
                <td className="px-4 py-3">
                  <StatusSelect id={row.id} status={row.status} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </main>
  );
}
