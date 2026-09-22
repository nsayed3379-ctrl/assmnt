"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function FinalSubmitButton({ incompleteCount }: { incompleteCount: number }) {
  const router = useRouter();
  const [confirming, setConfirming] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleFinalSubmit() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/candidate/final-submit", { method: "POST" });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(body.error || "Could not submit.");
      router.push("/assessment/completed");
    } catch (err: any) {
      setError(err.message || "Could not submit.");
      setLoading(false);
    }
  }

  if (!confirming) {
    return (
      <button
        onClick={() => setConfirming(true)}
        className="w-full rounded-lg border border-brand px-4 py-3 text-sm font-semibold text-brand hover:bg-brand/5"
      >
        Review & Final Submit
      </button>
    );
  }

  return (
    <div className="rounded-lg border border-amber-200 bg-amber-50 p-4">
      {incompleteCount > 0 && (
        <p className="text-sm text-amber-800">
          {incompleteCount} task(s) are not yet marked complete. You can still submit - anything left as a draft
          will be included as-is.
        </p>
      )}
      <p className="mt-2 text-sm font-medium text-amber-900">
        I confirm that all submitted work is my own and I am ready for final submission.
      </p>
      {error && <p className="mt-2 text-sm text-red-600">{error}</p>}
      <div className="mt-3 flex gap-2">
        <button
          onClick={() => setConfirming(false)}
          className="rounded-lg border border-slate-300 px-4 py-2 text-sm text-slate-600 hover:bg-white"
        >
          Cancel
        </button>
        <button
          onClick={handleFinalSubmit}
          disabled={loading}
          className="flex-1 rounded-lg bg-brand px-4 py-2 text-sm font-semibold text-white hover:bg-brand-dark disabled:opacity-60"
        >
          {loading ? "Submitting..." : "Final Submit"}
        </button>
      </div>
    </div>
  );
}
