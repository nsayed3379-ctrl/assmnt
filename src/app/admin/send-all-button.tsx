"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function SendAllButton({ assessmentId }: { assessmentId?: string }) {
  const router = useRouter();
  const [confirming, setConfirming] = useState(false);
  const [ack, setAck] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<{ sent: number; failed: number } | null>(null);

  if (!assessmentId) {
    return (
      <span
        className="text-sm text-slate-400"
        title="Filter the table to a single assessment first - invitations are sent per assessment."
      >
        Send Invitations
      </span>
    );
  }

  async function handleSend() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/send-invitations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ assessmentId }),
      });
      const body = await res.json();
      if (!res.ok) throw new Error(body.error || "Sending failed.");
      setResult({ sent: body.sent, failed: body.failed });
      setConfirming(false);
      setAck(false);
      router.refresh();
    } catch (err: any) {
      setError(err.message || "Sending failed.");
    } finally {
      setLoading(false);
    }
  }

  if (result) {
    return (
      <span className="text-sm text-slate-600">
        Sent {result.sent}
        {result.failed > 0 && `, ${result.failed} failed`}.
      </span>
    );
  }

  if (!confirming) {
    return (
      <button type="button" onClick={() => setConfirming(true)} className="text-sm font-medium text-brand hover:underline">
        Send Invitations
      </button>
    );
  }

  return (
    <span className="inline-flex flex-wrap items-center gap-2 text-sm">
      <label className="flex items-center gap-1.5 text-red-700">
        <input type="checkbox" checked={ack} onChange={(e) => setAck(e.target.checked)} />
        Email everyone pending on this assessment now?
      </label>
      <button
        type="button"
        onClick={handleSend}
        disabled={!ack || loading}
        className="rounded bg-red-600 px-2.5 py-1 text-xs font-medium text-white hover:bg-red-700 disabled:opacity-50"
      >
        {loading ? "Sending..." : "Confirm"}
      </button>
      <button
        type="button"
        onClick={() => {
          setConfirming(false);
          setAck(false);
        }}
        disabled={loading}
        className="text-xs text-slate-500 hover:text-slate-700"
      >
        Cancel
      </button>
      {error && <span className="text-xs text-red-600">{error}</span>}
    </span>
  );
}
