export function formatDuration(startedAt: string | null, submittedAt: string | null): string {
  if (!startedAt) return "not started";
  if (!submittedAt) return "in progress";
  const ms = new Date(submittedAt).getTime() - new Date(startedAt).getTime();
  const totalMinutes = Math.round(ms / 60000);
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  if (hours > 0) return `${hours}h ${minutes}m`;
  return `${minutes}m`;
}

export function formatMinutes(totalMinutes: number): string {
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  if (hours > 0 && minutes > 0) return `${hours}h ${minutes}m`;
  if (hours > 0) return `${hours}h`;
  return `${minutes}m`;
}

export function formatDateTime(value: string | null): string {
  if (!value) return "-";
  return new Date(value).toLocaleString("en-US", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "Asia/Dhaka",
  });
}

export const STATUS_LABELS: Record<string, string> = {
  invited: "Invited",
  opened: "Opened",
  started: "Started",
  in_progress: "In progress",
  submitted: "Submitted",
  under_review: "Under review",
  shortlisted: "Shortlisted",
  interview: "Interview",
  selected: "Selected",
  rejected: "Rejected",
};

export const STATUS_STYLES: Record<string, string> = {
  invited: "bg-slate-100 text-slate-600",
  opened: "bg-slate-100 text-slate-600",
  started: "bg-blue-100 text-blue-700",
  in_progress: "bg-blue-100 text-blue-700",
  submitted: "bg-amber-100 text-amber-700",
  under_review: "bg-amber-100 text-amber-700",
  shortlisted: "bg-emerald-100 text-emerald-700",
  interview: "bg-violet-100 text-violet-700",
  selected: "bg-emerald-100 text-emerald-700",
  rejected: "bg-red-100 text-red-700",
};

export const STATUS_OPTIONS = [
  "invited",
  "started",
  "in_progress",
  "submitted",
  "under_review",
  "shortlisted",
  "interview",
  "selected",
  "rejected",
];
