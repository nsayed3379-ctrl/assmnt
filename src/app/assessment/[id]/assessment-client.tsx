"use client";

import { useEffect, useMemo, useState } from "react";

type Props = {
  id: string;
  position: string;
  startedAt: string;
  durationMinutes: number;
  alreadySubmitted: boolean;
  instructions: string[];
};

function formatClock(ms: number) {
  const sign = ms < 0 ? "-" : "";
  const abs = Math.abs(ms);
  const totalSeconds = Math.floor(abs / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${sign}${minutes}:${seconds.toString().padStart(2, "0")}`;
}

export default function AssessmentClient({
  id,
  position,
  startedAt,
  durationMinutes,
  alreadySubmitted,
  instructions,
}: Props) {
  const deadline = useMemo(
    () => new Date(startedAt).getTime() + durationMinutes * 60 * 1000,
    [startedAt, durationMinutes]
  );

  // Corrects for the candidate's device clock being wrong. This only
  // affects what's *displayed* - the duration that actually gets recorded
  // is always computed server-side from started_at/submitted_at.
  const [clockOffset, setClockOffset] = useState(0);
  const [now, setNow] = useState(() => Date.now());
  const [submitted, setSubmitted] = useState(alreadySubmitted);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [githubUrl, setGithubUrl] = useState("");
  const [figmaUrl, setFigmaUrl] = useState("");
  const [liveDemoUrl, setLiveDemoUrl] = useState("");
  const [aiUsed, setAiUsed] = useState(false);
  const [aiTools, setAiTools] = useState("");
  const [notes, setNotes] = useState("");
  const [zipFile, setZipFile] = useState<File | null>(null);

  useEffect(() => {
    fetch("/api/time")
      .then((r) => r.json())
      .then((d) => setClockOffset(d.now - Date.now()))
      .catch(() => setClockOffset(0));
  }, []);

  useEffect(() => {
    const interval = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(interval);
  }, []);

  const correctedNow = now + clockOffset;
  const remainingMs = deadline - correctedNow;
  const isOvertime = remainingMs < 0;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (!githubUrl.trim() && !liveDemoUrl.trim() && !zipFile) {
      setError("Provide at least a GitHub URL, a live demo URL, or a ZIP upload.");
      return;
    }

    setSubmitting(true);
    try {
      const formData = new FormData();
      formData.set("id", id);
      formData.set("githubUrl", githubUrl.trim());
      formData.set("figmaUrl", figmaUrl.trim());
      formData.set("liveDemoUrl", liveDemoUrl.trim());
      formData.set("aiUsed", String(aiUsed));
      formData.set("aiTools", aiTools.trim());
      formData.set("notes", notes.trim());
      if (zipFile) formData.set("zip", zipFile);

      const res = await fetch("/api/submit", { method: "POST", body: formData });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error || "Could not submit. Please try again.");
      }

      setSubmitted(true);
    } catch (err: any) {
      setError(err.message || "Something went wrong.");
    } finally {
      setSubmitting(false);
    }
  }

  if (submitted) {
    return (
      <main className="mx-auto flex min-h-screen max-w-lg flex-col justify-center px-6 py-12 text-center">
        <div className="rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
          <h1 className="text-xl font-semibold text-slate-900">Thanks - you're all set!</h1>
          <p className="mt-2 text-sm text-slate-500">
            Your submission has been recorded. We'll be in touch about next steps.
          </p>
        </div>
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-2xl px-6 py-10">
      <div className="rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
        <div className="flex items-center justify-between">
          <h1 className="text-xl font-semibold text-slate-900">{position} Assessment</h1>
          <div
            className={`rounded-full px-3 py-1 text-sm font-mono font-medium ${
              isOvertime ? "bg-red-100 text-red-700" : "bg-brand/10 text-brand"
            }`}
          >
            {formatClock(remainingMs)}
          </div>
        </div>

        {isOvertime && (
          <p className="mt-2 text-xs text-red-600">
            Your allotted time has passed. You can still submit - overtime is recorded and shown
            to the reviewer, it does not block your submission.
          </p>
        )}

        <ul className="mt-6 list-disc space-y-2 pl-5 text-sm text-slate-700">
          {instructions.map((line, i) => (
            <li key={i}>{line}</li>
          ))}
        </ul>

        <form onSubmit={handleSubmit} className="mt-8 space-y-4 border-t border-slate-100 pt-6">
          <h2 className="text-sm font-semibold text-slate-900">Submit your work</h2>

          <div>
            <label className="block text-sm font-medium text-slate-700">GitHub URL</label>
            <input
              type="url"
              value={githubUrl}
              onChange={(e) => setGithubUrl(e.target.value)}
              placeholder="https://github.com/you/repo"
              className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-brand focus:outline-none focus:ring-1 focus:ring-brand"
            />
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label className="block text-sm font-medium text-slate-700">Figma URL (optional)</label>
              <input
                type="url"
                value={figmaUrl}
                onChange={(e) => setFigmaUrl(e.target.value)}
                placeholder="https://figma.com/..."
                className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-brand focus:outline-none focus:ring-1 focus:ring-brand"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700">Live demo URL (optional)</label>
              <input
                type="url"
                value={liveDemoUrl}
                onChange={(e) => setLiveDemoUrl(e.target.value)}
                placeholder="https://your-demo.vercel.app"
                className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-brand focus:outline-none focus:ring-1 focus:ring-brand"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700">
              Or upload a ZIP of your project (optional, 50 MB max)
            </label>
            <input
              type="file"
              accept=".zip"
              onChange={(e) => setZipFile(e.target.files?.[0] || null)}
              className="mt-1 w-full text-sm"
            />
          </div>

          <div className="rounded-lg bg-slate-50 p-4">
            <label className="flex items-center gap-2 text-sm font-medium text-slate-700">
              <input
                type="checkbox"
                checked={aiUsed}
                onChange={(e) => setAiUsed(e.target.checked)}
                className="h-4 w-4 rounded border-slate-300"
              />
              I used AI tools while completing this assessment
            </label>
            {aiUsed && (
              <input
                type="text"
                value={aiTools}
                onChange={(e) => setAiTools(e.target.value)}
                placeholder="Which tools? e.g. Claude, ChatGPT, Copilot"
                className="mt-2 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-brand focus:outline-none focus:ring-1 focus:ring-brand"
              />
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700">Notes (optional)</label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
              placeholder="Anything you'd like the reviewer to know"
              className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-brand focus:outline-none focus:ring-1 focus:ring-brand"
            />
          </div>

          {error && <p className="text-sm text-red-600">{error}</p>}

          <button
            type="submit"
            disabled={submitting}
            className="w-full rounded-lg bg-brand px-4 py-2.5 text-sm font-medium text-white transition hover:bg-brand-dark disabled:opacity-60"
          >
            {submitting ? "Submitting..." : "Submit Assessment"}
          </button>
        </form>
      </div>
    </main>
  );
}
