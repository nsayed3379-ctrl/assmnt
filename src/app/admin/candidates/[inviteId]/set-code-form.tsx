"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function SetCodeForm({ inviteId }: { inviteId: string }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/set-access-code", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ inviteId, code }),
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(body.error || "Could not set the code.");
      setOpen(false);
      setCode("");
      router.refresh();
    } catch (err: any) {
      setError(err.message || "Could not set the code.");
    } finally {
      setLoading(false);
    }
  }

  if (!open) {
    return (
      <button type="button" onClick={() => setOpen(true)} className="text-xs font-medium text-brand hover:underline">
        Set a fixed code
      </button>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="flex items-center gap-2">
      <input
        type="text"
        value={code}
        onChange={(e) => setCode(e.target.value)}
        placeholder="e.g. ABC12345"
        autoFocus
        className="rounded border border-slate-300 px-2 py-1 font-mono text-xs uppercase focus:border-brand focus:outline-none"
      />
      <button
        type="submit"
        disabled={loading || code.trim().length < 6}
        className="text-xs font-medium text-brand hover:underline disabled:opacity-50"
      >
        {loading ? "Saving..." : "Save"}
      </button>
      <button
        type="button"
        onClick={() => {
          setOpen(false);
          setError(null);
        }}
        className="text-xs text-slate-400 hover:underline"
      >
        Cancel
      </button>
      {error && <span className="text-xs text-red-600">{error}</span>}
    </form>
  );
}
