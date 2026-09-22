"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function CandidateLoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [resendState, setResendState] = useState<"idle" | "sending" | "sent">("idle");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const res = await fetch("/api/candidate/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim(), code: code.trim() }),
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(body.error || "Could not sign in.");

      router.push(body.needsName ? "/assessment/set-name" : "/assessment/dashboard");
      router.refresh();
    } catch (err: any) {
      setError(err.message || "Could not sign in.");
    } finally {
      setLoading(false);
    }
  }

  async function handleResendCode() {
    if (!email.trim()) {
      setError("Enter your email above first, then click \"Resend my code\".");
      return;
    }
    setResendState("sending");
    try {
      await fetch("/api/candidate/resend-code", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim() }),
      });
    } finally {
      setResendState("sent");
    }
  }

  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col justify-center px-6 py-12">
      <div className="rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
        <h1 className="text-lg font-semibold text-slate-900">Vecosoft Assessment Portal</h1>
        <p className="mt-1 text-sm text-slate-500">Sign in with the email and access code from your invitation.</p>

        <form onSubmit={handleSubmit} className="mt-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700">Email</label>
            <input
              type="email"
              required
              autoFocus
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-brand focus:outline-none focus:ring-1 focus:ring-brand"
              placeholder="you@example.com"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700">Access Code</label>
            <input
              type="text"
              required
              value={code}
              onChange={(e) => setCode(e.target.value.toUpperCase())}
              className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm font-mono tracking-wide focus:border-brand focus:outline-none focus:ring-1 focus:ring-brand"
              placeholder="VSOFT-XXXX-XXXX"
            />
          </div>

          {error && <p className="text-sm text-red-600">{error}</p>}

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-lg bg-brand px-4 py-2.5 text-sm font-medium text-white hover:bg-brand-dark disabled:opacity-60"
          >
            {loading ? "Verifying..." : "Verify & Continue"}
          </button>
        </form>

        <div className="mt-4 text-center text-sm">
          {resendState === "sent" ? (
            <p className="text-slate-500">If that email is on our list, a code has been sent.</p>
          ) : (
            <button
              type="button"
              onClick={handleResendCode}
              disabled={resendState === "sending"}
              className="text-brand hover:underline"
            >
              {resendState === "sending" ? "Sending..." : "Lost your code? Resend it"}
            </button>
          )}
        </div>
      </div>
    </main>
  );
}
