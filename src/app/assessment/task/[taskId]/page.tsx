import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { getCandidateSession } from "@/lib/candidateAuth";
import TimerBadge from "../../timer-badge";
import ProtectedText from "./protected-text";
import TaskForm from "./task-form";

export const dynamic = "force-dynamic";

const TEXT_TYPES = ["short_answer", "long_answer", "mcq"];

export default async function TaskPage({ params }: { params: Promise<{ taskId: string }> }) {
  const { taskId } = await params;
  const session = await getCandidateSession();
  if (!session) redirect("/assessment/login");

  const db = supabaseAdmin();

  const { data: invite } = await db
    .from("assessment_invites")
    .select("id, assessment_id, started_at, submitted_at, expires_at")
    .eq("id", session.inviteId)
    .single();

  if (!invite) redirect("/assessment/login");
  if (!invite.started_at) redirect("/assessment/dashboard");
  if (invite.submitted_at) redirect("/assessment/completed");

  const { data: task } = await db
    .from("assessment_tasks")
    .select("id, title, description, task_type, options, max_score, required, resources_url, assessment_id")
    .eq("id", taskId)
    .single();

  if (!task || task.assessment_id !== invite.assessment_id) notFound();

  // Best-effort, same as the dashboard: `fields` is new and may not exist
  // yet on every environment's DB (see supabase/migrations/0002_...).
  // Fetched separately so a not-yet-migrated DB never 404s the task page -
  // it just falls back to the single-input rendering until it's run.
  const taskFields = await db
    .from("assessment_tasks")
    .select("fields")
    .eq("id", taskId)
    .single()
    .then(({ data, error }) => (error ? null : data?.fields ?? null));

  const { data: submission } = await db
    .from("submissions")
    .select("content, github_url, live_url, file_path, status")
    .eq("invite_id", invite.id)
    .eq("task_id", taskId)
    .single();

  const watermarkText = `${session.email} - ${new Date().toLocaleString("en-US", { timeZone: "Asia/Dhaka" })}`;

  return (
    <main className="mx-auto max-w-2xl px-6 py-10">
      <div className="flex items-center justify-between">
        <Link href="/assessment/dashboard" className="text-sm text-slate-500 hover:text-slate-700">
          &larr; Back to dashboard
        </Link>
        {invite.expires_at && <TimerBadge expiresAt={invite.expires_at} />}
      </div>

      <div className="mt-4 rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
        <h1 className="text-xl font-semibold text-slate-900">
          {task.title}
          {task.required && <span className="ml-1 text-red-500">*</span>}
        </h1>
        <p className="mt-1 text-xs text-slate-400">Max score: {task.max_score}</p>

        <div className="mt-4">
          <ProtectedText
            watermarkText={watermarkText}
            taskId={task.id}
            logIntegrityEvents={TEXT_TYPES.includes(task.task_type)}
          >
            <p className="whitespace-pre-wrap">{task.description}</p>
            {task.resources_url && (
              <p className="mt-3">
                <a href={task.resources_url} target="_blank" rel="noreferrer" className="text-brand hover:underline">
                  Download resources
                </a>
              </p>
            )}
          </ProtectedText>
        </div>

        <TaskForm
          taskId={task.id}
          taskType={task.task_type}
          options={task.options}
          fields={taskFields}
          existing={submission || null}
          existingFileName={submission?.file_path ? submission.file_path.split("/").pop() || null : null}
          logIntegrityEvents={TEXT_TYPES.includes(task.task_type)}
        />
      </div>
    </main>
  );
}
