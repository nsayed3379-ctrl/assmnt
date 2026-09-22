import Link from "next/link";
import { notFound } from "next/navigation";
import { supabaseAdmin, SUBMISSIONS_BUCKET } from "@/lib/supabaseAdmin";
import { getAdminSession } from "@/lib/auth";
import { redirect } from "next/navigation";
import { formatDateTime, formatDuration, STATUS_LABELS } from "@/lib/format";
import InviteStatusSelect from "../../invite-status-select";
import ScoreForm from "./score-form";
import AccessCodeReveal from "./access-code-reveal";
import GenerateCodeButton from "./generate-code-button";
import SetCodeForm from "./set-code-form";
import { decryptAccessCode } from "@/lib/codes";

export const dynamic = "force-dynamic";

export default async function CandidateDetailPage({ params }: { params: Promise<{ inviteId: string }> }) {
  const session = await getAdminSession();
  if (!session) redirect("/admin/login");

  const { inviteId } = await params;
  const db = supabaseAdmin();

  const { data: invite } = await db
    .from("assessment_invites")
    .select(
      "id, candidate_id, assessment_id, status, started_at, submitted_at, expires_at, access_code_last4, access_code_encrypted"
    )
    .eq("id", inviteId)
    .single();

  if (!invite) notFound();

  let accessCode: string | null = null;
  if (invite.access_code_encrypted) {
    try {
      accessCode = decryptAccessCode(invite.access_code_encrypted);
    } catch (err) {
      console.error("Failed to decrypt access code", err);
    }
  }

  const [{ data: candidate }, { data: assessment }, { data: tasks }, { data: submissions }, { data: history }, { data: integrityEvents }] =
    await Promise.all([
      db.from("candidates").select("email, full_name, phone").eq("id", invite.candidate_id).single(),
      db.from("assessments").select("title, duration_minutes").eq("id", invite.assessment_id).single(),
      db
        .from("assessment_tasks")
        .select("id, title, description, task_type, max_score, sort_order")
        .eq("assessment_id", invite.assessment_id)
        .order("sort_order", { ascending: true }),
      db.from("submissions").select("*").eq("invite_id", invite.id),
      db.from("candidate_status_history").select("*").eq("invite_id", invite.id).order("changed_at", { ascending: false }),
      db.from("integrity_events").select("event_type, event_count").eq("invite_id", invite.id),
    ]);

  const submissionByTask = new Map((submissions || []).map((s) => [s.task_id, s]));
  const submissionIds = (submissions || []).map((s) => s.id);

  const { data: scores } = submissionIds.length
    ? await db.from("evaluation_scores").select("*").in("submission_id", submissionIds)
    : { data: [] as any[] };
  const scoreBySubmission = new Map((scores || []).map((s) => [s.submission_id, s]));

  const signedUrls = new Map<string, string>();
  for (const s of submissions || []) {
    if (s.file_path) {
      const { data: signed } = await db.storage.from(SUBMISSIONS_BUCKET).createSignedUrl(s.file_path, 60 * 10);
      if (signed) signedUrls.set(s.id, signed.signedUrl);
    }
  }

  const integritySummary: Record<string, number> = {};
  for (const ev of integrityEvents || []) {
    integritySummary[ev.event_type] = (integritySummary[ev.event_type] || 0) + (ev.event_count || 1);
  }

  const totalEarned = (scores || []).reduce((sum, s) => sum + Number(s.score), 0);
  const totalMax = (scores || []).reduce((sum, s) => sum + Number(s.max_score), 0);

  return (
    <main className="mx-auto max-w-3xl px-6 py-10">
      <Link href="/admin" className="text-sm text-slate-500 hover:text-slate-700">
        &larr; Back to dashboard
      </Link>

      <div className="mt-4 rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-xl font-semibold text-slate-900">{candidate?.full_name || candidate?.email}</h1>
            <p className="text-sm text-slate-500">{candidate?.email}</p>
            <p className="mt-1 font-mono text-xs text-slate-400">Candidate ID: {invite.id}</p>
            <p className="mt-1 text-sm text-slate-500">{assessment?.title}</p>
          </div>
          <InviteStatusSelect inviteId={invite.id} status={invite.status} />
        </div>

        <div className="mt-4 flex flex-wrap items-center gap-2 border-t border-slate-100 pt-4 text-sm">
          <dt className="text-slate-400">Access code</dt>
          {accessCode ? (
            <AccessCodeReveal code={accessCode} />
          ) : invite.status === "invited" ? (
            <span className="text-slate-400">Not available yet (last4: {invite.access_code_last4 || "?"}).</span>
          ) : (
            <span className="text-slate-400">
              Not available (last4: {invite.access_code_last4 || "?"}) &mdash; this candidate&apos;s status is already
              &quot;{STATUS_LABELS[invite.status] || invite.status}&quot;, so changing the code would risk invalidating
              the one they may already be using.
            </span>
          )}
          {invite.status === "invited" && (
            <>
              <SetCodeForm inviteId={invite.id} />
              <span className="text-slate-300">·</span>
              <GenerateCodeButton inviteId={invite.id} assessmentId={invite.assessment_id} />
            </>
          )}
        </div>

        <dl className="mt-6 grid grid-cols-2 gap-4 border-t border-slate-100 pt-6 text-sm sm:grid-cols-4">
          <div>
            <dt className="text-slate-400">Started</dt>
            <dd className="text-slate-800">{formatDateTime(invite.started_at)}</dd>
          </div>
          <div>
            <dt className="text-slate-400">Submitted</dt>
            <dd className="text-slate-800">{formatDateTime(invite.submitted_at)}</dd>
          </div>
          <div>
            <dt className="text-slate-400">Duration</dt>
            <dd className="text-slate-800">{formatDuration(invite.started_at, invite.submitted_at)}</dd>
          </div>
          <div>
            <dt className="text-slate-400">Total score</dt>
            <dd className="text-slate-800">{totalMax > 0 ? `${totalEarned} / ${totalMax}` : "-"}</dd>
          </div>
        </dl>

        {Object.keys(integritySummary).length > 0 && (
          <div className="mt-4 rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">
            <strong>Integrity signals:</strong>{" "}
            {Object.entries(integritySummary)
              .map(([type, count]) => `${type.replace(/_/g, " ")} (${count})`)
              .join(", ")}
          </div>
        )}
      </div>

      <div className="mt-6 space-y-4">
        {(tasks || []).map((task) => {
          const submission = submissionByTask.get(task.id);
          const score = submission ? scoreBySubmission.get(submission.id) : null;
          return (
            <div key={task.id} className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
              <div className="flex items-center justify-between">
                <h2 className="font-medium text-slate-900">{task.title}</h2>
                <span className="text-xs text-slate-400">{submission?.status || "not started"}</span>
              </div>

              <div className="mt-3 space-y-1 text-sm">
                {submission?.content && <p className="whitespace-pre-wrap text-slate-700">{submission.content}</p>}
                {submission?.github_url && (
                  <a href={submission.github_url} target="_blank" rel="noreferrer" className="block text-brand hover:underline">
                    {submission.github_url}
                  </a>
                )}
                {submission?.live_url && (
                  <a href={submission.live_url} target="_blank" rel="noreferrer" className="block text-brand hover:underline">
                    {submission.live_url}
                  </a>
                )}
                {submission?.file_path && signedUrls.get(submission.id) && (
                  <a href={signedUrls.get(submission.id)} target="_blank" rel="noreferrer" className="block text-brand hover:underline">
                    Download submitted file
                  </a>
                )}
                {!submission && <p className="text-slate-400">No submission yet.</p>}
              </div>

              {submission ? (
                <ScoreForm
                  submissionId={submission.id}
                  maxScore={task.max_score}
                  initialScore={score ? Number(score.score) : null}
                  initialComment={score?.comment || null}
                />
              ) : (
                <p className="mt-2 text-xs text-slate-400">Scoring will be available once the candidate submits this task.</p>
              )}
            </div>
          );
        })}
      </div>

      {history && history.length > 0 && (
        <div className="mt-6 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="font-medium text-slate-900">Status history</h2>
          <ul className="mt-3 space-y-1 text-sm text-slate-600">
            {history.map((h) => (
              <li key={h.id}>
                {formatDateTime(h.changed_at)} &mdash; {h.from_status ? `${STATUS_LABELS[h.from_status] || h.from_status} → ` : ""}
                {STATUS_LABELS[h.to_status] || h.to_status} <span className="text-slate-400">by {h.changed_by}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </main>
  );
}
