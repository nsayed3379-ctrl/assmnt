"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function GenerateCodeButton({ inviteId, assessmentId }: { inviteId: string; assessmentId: string }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleClick() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/send-invitations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ assessmentId, inviteIds: [inviteId] }),
      });
      const body = await res.json().catch(() => ({}));
      // codesGenerated (not `sent`) is success here: every invite already
      // has a code (see backfill), so this normally just resends the
      // existing one - the code being confirmed/ready doesn't depend on
      // whether the email delivery that follows succeeds (e.g.
      // RESEND_API_KEY not configured yet).
      if (!res.ok || !body.codesGenerated) throw new Error(body.error || "Could not send the code.");
      router.refresh();
    } catch (err: any) {
      setError(err.message || "Could not send the code.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <span className="inline-flex items-center gap-2">
      <button
        type="button"
        onClick={handleClick}
        disabled={loading}
        className="text-xs font-medium text-brand hover:underline disabled:opacity-60"
      >
        {loading ? "Sending..." : "Send / Resend Code by Email"}
      </button>
      {error && <span className="text-xs text-red-600">{error}</span>}
    </span>
  );
}
