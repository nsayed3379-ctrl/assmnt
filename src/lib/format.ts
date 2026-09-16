export function formatDuration(startedAt: string, submittedAt: string | null): string {
  if (!submittedAt) return "in progress";
  const ms = new Date(submittedAt).getTime() - new Date(startedAt).getTime();
  const totalMinutes = Math.round(ms / 60000);
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  if (hours > 0) return `${hours}h ${minutes}m`;
  return `${minutes}m`;
}

export function formatDateTime(value: string | null): string {
  if (!value) return "-";
  return new Date(value).toLocaleString(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

export const STATUS_LABELS: Record<string, string> = {
  in_progress: "In progress",
  review: "Review",
  shortlist: "Shortlist",
  rejected: "Rejected",
};

export const STATUS_STYLES: Record<string, string> = {
  in_progress: "bg-slate-100 text-slate-600",
  review: "bg-amber-100 text-amber-700",
  shortlist: "bg-emerald-100 text-emerald-700",
  rejected: "bg-red-100 text-red-700",
};
