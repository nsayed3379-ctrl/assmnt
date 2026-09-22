"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function SendMailButton({ assessmentId, inviteId }: { assessmentId: string; inviteId: string }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);

  async function handleClick(e: React.MouseEvent) {
    e.stopPropagation();
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/send-invitations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ assessmentId, inviteIds: [inviteId] }),
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(body.error || "Could not send the email.");
      // `codesGenerated` only means the invite has a code - it says nothing
      // about delivery. `sent`/`failed` are the actual Resend outcome, so
      // those are what the label must reflect (see email_logs for the
      // per-recipient reason on a failure).
      if (body.sent > 0) {
        setSent(true);
      } else {
        throw new Error("Code is ready, but the email failed to send - check the email configuration.");
      }
      router.refresh();
    } catch (err: any) {
      setError(err.message || "Could not send the email.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <span className="inline-flex items-center gap-1.5">
      <button
        type="button"
        onClick={handleClick}
        disabled={loading}
        className="text-xs font-medium text-brand hover:underline disabled:opacity-60"
      >
        {loading ? "Sending..." : sent ? "Sent" : "Send Mail"}
      </button>
      {error && <span className="text-xs text-red-600">{error}</span>}
    </span>
  );
}
