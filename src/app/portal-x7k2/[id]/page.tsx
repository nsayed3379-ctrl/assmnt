import Link from "next/link";
import { notFound } from "next/navigation";
import { supabaseAdmin, SUBMISSIONS_BUCKET } from "@/lib/supabaseAdmin";
import { formatDateTime, formatDuration } from "@/lib/format";
import StatusSelect from "../status-select";

export const dynamic = "force-dynamic";

export default async function CandidateDetail({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const db = supabaseAdmin();
  const { data, error } = await db.from("assessments").select("*").eq("id", id).single();

  if (error || !data) notFound();

  let zipSignedUrl: string | null = null;
  if (data.zip_path) {
    const { data: signed } = await db.storage
      .from(SUBMISSIONS_BUCKET)
      .createSignedUrl(data.zip_path, 60 * 10); // valid for 10 minutes
    zipSignedUrl = signed?.signedUrl || null;
  }

  return (
    <main className="mx-auto max-w-2xl px-6 py-10">
      <Link href="/portal-x7k2" className="text-sm text-slate-500 hover:text-slate-700">
        &larr; Back to dashboard
      </Link>

      <div className="mt-4 rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-xl font-semibold text-slate-900">{data.full_name || data.email}</h1>
            <p className="text-sm text-slate-500">{data.email}</p>
            <p className="mt-1 text-sm text-slate-500">{data.position}</p>
          </div>
          <StatusSelect id={data.id} status={data.status} />
        </div>

        <dl className="mt-6 grid grid-cols-2 gap-4 border-t border-slate-100 pt-6 text-sm">
          <div>
            <dt className="text-slate-400">Started</dt>
            <dd className="text-slate-800">{formatDateTime(data.started_at)}</dd>
          </div>
          <div>
            <dt className="text-slate-400">Submitted</dt>
            <dd className="text-slate-800">{formatDateTime(data.submitted_at)}</dd>
          </div>
          <div>
            <dt className="text-slate-400">Duration</dt>
            <dd className="text-slate-800">{formatDuration(data.started_at, data.submitted_at)}</dd>
          </div>
          <div>
            <dt className="text-slate-400">Allotted</dt>
            <dd className="text-slate-800">{data.duration_minutes}m</dd>
          </div>
        </dl>

        <div className="mt-6 space-y-2 border-t border-slate-100 pt-6 text-sm">
          <LinkRow label="GitHub" url={data.github_url} />
          <LinkRow label="Figma" url={data.figma_url} />
          <LinkRow label="Live Demo" url={data.live_demo_url} />
          {zipSignedUrl && <LinkRow label="ZIP upload" url={zipSignedUrl} />}
        </div>

        <div className="mt-6 border-t border-slate-100 pt-6 text-sm">
          <h2 className="font-medium text-slate-900">AI declaration</h2>
          <p className="mt-1 text-slate-600">
            {data.ai_used ? `Used AI tools: ${data.ai_tools || "(not specified)"}` : "No AI tools declared"}
          </p>
        </div>

        {data.notes && (
          <div className="mt-6 border-t border-slate-100 pt-6 text-sm">
            <h2 className="font-medium text-slate-900">Candidate notes</h2>
            <p className="mt-1 whitespace-pre-wrap text-slate-600">{data.notes}</p>
          </div>
        )}
      </div>
    </main>
  );
}

function LinkRow({ label, url }: { label: string; url: string | null }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-slate-500">{label}</span>
      {url ? (
        <a href={url} target="_blank" rel="noreferrer" className="font-medium text-brand hover:underline">
          Open
        </a>
      ) : (
        <span className="text-slate-300">&mdash;</span>
      )}
    </div>
  );
}
