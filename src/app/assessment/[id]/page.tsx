import { notFound } from "next/navigation";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { getTask } from "@/lib/tasks";
import AssessmentClient from "./assessment-client";

export const dynamic = "force-dynamic";

export default async function AssessmentPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const { data, error } = await supabaseAdmin()
    .from("assessments")
    .select("id, position, started_at, duration_minutes, submitted_at")
    .eq("id", id)
    .single();

  if (error || !data) {
    notFound();
  }

  const task = getTask(data.position);

  return (
    <AssessmentClient
      id={data.id}
      position={data.position}
      startedAt={data.started_at}
      durationMinutes={data.duration_minutes}
      alreadySubmitted={Boolean(data.submitted_at)}
      instructions={task.instructions}
    />
  );
}
