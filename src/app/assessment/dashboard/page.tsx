import Link from "next/link";
import { redirect } from "next/navigation";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { getCandidateSession } from "@/lib/candidateAuth";
import { formatDateTime, formatMinutes } from "@/lib/format";
import TimerBadge from "../timer-badge";
import StartButton from "./start-button";
import FinalSubmitButton from "./final-submit-button";

export const dynamic = "force-dynamic";

export default async function CandidateDashboard() {
  const session = await getCandidateSession();
  if (!session) redirect("/assessment/login");

  const db = supabaseAdmin();

  const { data: invite } = await db
    .from("assessment_invites")
    .select("id, status, started_at, submitted_at, expires_at, assessment_id")
    .eq("id", session.inviteId)
    .single();

  if (!invite) redirect("/assessment/login");
  if (invite.submitted_at) redirect("/assessment/completed");

  const [{ data: candidate }, { data: assessment }, { data: tasks }] = await Promise.all([
    db.from("candidates").select("full_name").eq("id", session.candidateId).single(),
    db.from("assessments").select("title, duration_minutes, hard_deadline").eq("id", invite.assessment_id).single(),
    db
      .from("assessment_tasks")
      .select("id, title, task_type, max_score, required, sort_order")
      .eq("assessment_id", invite.assessment_id)
      .order("sort_order", { ascending: true }),
  ]);

  if (!candidate?.full_name) redirect("/assessment/set-name");
  if (!assessment) {
    return (
      <main className="mx-auto max-w-lg px-6 py-12 text-center text-slate-500">
        Assessment configuration not found. Please contact the recruitment team.
      </main>
    );
  }

  // Best-effort: this column is new and may not exist yet on every
  // environment's DB (see supabase/migrations/0002_...). Fetched separately
  // and swallowed on error so a not-yet-migrated DB never breaks the
  // dashboard - candidates just don't see this section until it's run.
  const generalInstructions = await db
    .from("assessments")
    .select("general_instructions")
    .eq("id", invite.assessment_id)
    .single()
    .then(({ data, error }) => (error ? null : data?.general_instructions ?? null));

  const taskList = tasks || [];

  if (!invite.started_at) {
    return (
      <main className="mx-auto flex min-h-screen max-w-lg flex-col justify-center px-6">
        <div className="rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
          <h1 className="text-xl font-semibold text-slate-900">Welcome, {candidate.full_name}</h1>
          <p className="mt-1 text-sm text-slate-500">{assessment.title}</p>

          <dl className="mt-6 space-y-2 text-sm">
            <div className="flex justify-between">
              <dt className="text-slate-500">Tasks</dt>
              <dd className="font-medium text-slate-800">{taskList.length}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-slate-500">Time limit</dt>
              <dd className="font-medium text-slate-800">{formatMinutes(assessment.duration_minutes)}</dd>
            </div>
            {assessment.hard_deadline && (
              <div className="flex justify-between">
                <dt className="text-slate-500">Must be completed by</dt>
                <dd className="font-medium text-slate-800">{formatDateTime(assessment.hard_deadline)}</dd>
              </div>
            )}
          </dl>

          <p className="mt-4 text-xs text-slate-400">
            Your timer starts the moment you click Start, and is tracked on our server - refreshing or closing this
            page will not reset it.
          </p>

          {generalInstructions && (
            <div className="mt-6 rounded-lg border border-slate-200 bg-slate-50 p-4">
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">General Instructions</p>
              <p className="mt-2 whitespace-pre-wrap text-sm text-slate-700">{generalInstructions}</p>
            </div>
          )}

          <div className="mt-6">
            <StartButton />
          </div>
        </div>
      </main>
    );
  }

  const { data: submissions } = await db
    .from("submissions")
    .select("task_id, status")
    .eq("invite_id", invite.id);

  const submittedTaskIds = new Set((submissions || []).filter((s) => s.status === "submitted").map((s) => s.task_id));
  const completedCount = taskList.filter((t) => submittedTaskIds.has(t.id)).length;

  return (
    <main className="mx-auto max-w-2xl px-6 py-10">
      <div className="rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-semibold text-slate-900">{assessment.title}</h1>
            <p className="text-sm text-slate-500">Welcome, {candidate.full_name}</p>
          </div>
          {invite.expires_at && <TimerBadge expiresAt={invite.expires_at} />}
        </div>

        {generalInstructions && (
          <details className="mt-4 rounded-lg border border-slate-200 bg-slate-50 p-4 text-sm">
            <summary className="cursor-pointer font-medium text-slate-700">General Instructions</summary>
            <p className="mt-2 whitespace-pre-wrap text-slate-600">{generalInstructions}</p>
          </details>
        )}

        <p className="mt-4 text-sm text-slate-500">
          Progress: {completedCount} / {taskList.length} tasks completed
        </p>

        <ul className="mt-4 space-y-2">
          {taskList.map((task, idx) => {
            const done = submittedTaskIds.has(task.id);
            return (
              <li key={task.id}>
                <Link
                  href={`/assessment/task/${task.id}`}
                  className="flex items-center justify-between rounded-lg border border-slate-200 px-4 py-3 text-sm hover:border-brand hover:bg-brand/5"
                >
                  <span>
                    <span className="mr-2 text-slate-400">{idx + 1}.</span>
                    {task.title}
                    {task.required && <span className="ml-1 text-red-500">*</span>}
                  </span>
                  <span className={done ? "text-emerald-600" : "text-slate-400"}>{done ? "Completed" : "Open"}</span>
                </Link>
              </li>
            );
          })}
        </ul>

        <div className="mt-8 border-t border-slate-100 pt-6">
          <FinalSubmitButton incompleteCount={taskList.length - completedCount} />
        </div>
      </div>
    </main>
  );
}
