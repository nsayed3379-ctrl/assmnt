"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function ScoreForm({
  submissionId,
  maxScore,
  initialScore,
  initialComment,
}: {
  submissionId: string;
  maxScore: number;
  initialScore: number | null;
  initialComment: string | null;
}) {
  const router = useRouter();
  const [score, setScore] = useState(initialScore ?? "");
  const [comment, setComment] = useState(initialComment || "");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  async function handleSave() {
    setSaving(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/score", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ submissionId, score: Number(score), maxScore, comment }),
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(body.error || "Could not save score.");
      setSaved(true);
      router.refresh();
    } catch (err: any) {
      setError(err.message || "Could not save score.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="mt-3 rounded-lg bg-slate-50 p-3">
      <div className="flex items-center gap-2">
        <input
          type="number"
          min={0}
          max={maxScore}
          value={score}
          onChange={(e) => {
            setScore(e.target.value === "" ? "" : Number(e.target.value));
            setSaved(false);
          }}
          className="w-20 rounded-lg border border-slate-300 px-2 py-1.5 text-sm"
        />
        <span className="text-sm text-slate-500">/ {maxScore}</span>
      </div>
      <textarea
        value={comment}
        onChange={(e) => {
          setComment(e.target.value);
          setSaved(false);
        }}
        rows={2}
        placeholder="Reviewer comment (optional)"
        className="mt-2 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
      />
      {error && <p className="mt-1 text-sm text-red-600">{error}</p>}
      <button
        onClick={handleSave}
        disabled={saving || score === ""}
        className="mt-2 rounded-lg bg-brand px-3 py-1.5 text-xs font-medium text-white hover:bg-brand-dark disabled:opacity-60"
      >
        {saving ? "Saving..." : saved ? "Saved" : "Save Evaluation"}
      </button>
    </div>
  );
}
