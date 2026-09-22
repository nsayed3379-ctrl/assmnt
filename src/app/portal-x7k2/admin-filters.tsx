"use client";

type Option = { value: string; label: string };

export default function AdminFilters({
  search,
  assessmentId,
  status,
  assessmentOptions,
  statusOptions,
}: {
  search?: string;
  assessmentId?: string;
  status?: string;
  assessmentOptions: Option[];
  statusOptions: Option[];
}) {
  return (
    <form method="get" className="flex flex-wrap items-center gap-3">
      <input
        type="text"
        name="q"
        defaultValue={search || ""}
        placeholder="Search name, email, or candidate ID"
        className="w-72 rounded-lg border border-slate-300 px-3 py-1.5 text-sm focus:border-brand focus:outline-none focus:ring-1 focus:ring-brand"
      />
      <select
        name="assessmentId"
        defaultValue={assessmentId || ""}
        onChange={(e) => e.currentTarget.form?.submit()}
        className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm"
      >
        {assessmentOptions.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
      <select
        name="status"
        defaultValue={status || ""}
        onChange={(e) => e.currentTarget.form?.submit()}
        className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm"
      >
        {statusOptions.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
      <button
        type="submit"
        className="rounded-lg bg-slate-900 px-3 py-1.5 text-sm font-medium text-white hover:bg-slate-800"
      >
        Search
      </button>
    </form>
  );
}
