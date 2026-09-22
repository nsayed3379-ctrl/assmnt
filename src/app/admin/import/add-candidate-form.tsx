"use client";

import { useState } from "react";

type Assessment = { id: string; title: string; status: string };
type AddedCandidate = { email: string; fullName: string | null; accessCode: string };

export default function AddCandidateForm({ assessments }: { assessments: Assessment[] }) {
  const [assessmentId, setAssessmentId] = useState(assessments[0]?.id || "");
  const [email, setEmail] = useState("");
  const [fullName, setFullName] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [added, setAdded] = useState<AddedCandidate | null>(null);
  const [copied, setCopied] = useState(false);

  async function handleAdd() {
    if (!assessmentId || !email) {
      setError("Choose an assessment and enter an email first.");
      return;
    }
    setError(null);
    setLoading(true);
    setAdded(null);
    try {
      const res = await fetch("/api/admin/candidates/add", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ assessmentId, email, fullName: fullName || null }),
      });
      const body = await res.json();
      if (!res.ok) throw new Error(body.error || "Could not add candidate.");
      setAdded({ email: body.email, fullName: body.fullName, accessCode: body.accessCode });
      setEmail("");
      setFullName("");
    } catch (err: any) {
      setError(err.message || "Could not add candidate.");
    } finally {
      setLoading(false);
    }
  }

  async function copyCode() {
    if (!added) return;
    try {
      await navigator.clipboard.writeText(added.accessCode);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      // clipboard API can be unavailable (e.g. insecure context) - not worth surfacing
    }
  }

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
      <h2 className="text-sm font-semibold text-slate-900">Add a Single Candidate</h2>
      <p className="mt-1 text-sm text-slate-500">
        Adds one candidate to the assessment and generates their access code immediately.
      </p>

      <label className="mt-4 block text-sm font-medium text-slate-700">Assessment</label>
      <select
        value={assessmentId}
        onChange={(e) => setAssessmentId(e.target.value)}
        className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
      >
        {assessments.length === 0 && <option value="">No assessments yet - seed one first</option>}
        {assessments.map((a) => (
          <option key={a.id} value={a.id}>
            {a.title} ({a.status})
          </option>
        ))}
      </select>

      <label className="mt-4 block text-sm font-medium text-slate-700">Email</label>
      <input
        type="email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        placeholder="candidate@example.com"
        className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
      />

      <label className="mt-4 block text-sm font-medium text-slate-700">Full name (optional)</label>
      <input
        type="text"
        value={fullName}
        onChange={(e) => setFullName(e.target.value)}
        placeholder="Jane Doe"
        className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
      />

      {error && <p className="mt-2 text-sm text-red-600">{error}</p>}

      <button
        onClick={handleAdd}
        disabled={loading || !email || !assessmentId}
        className="mt-4 rounded-lg bg-brand px-4 py-2 text-sm font-medium text-white hover:bg-brand-dark disabled:opacity-60"
      >
        {loading ? "Adding..." : "Add Candidate"}
      </button>

      {added && (
        <div className="mt-4 rounded-lg border border-emerald-200 bg-emerald-50 p-4">
          <p className="text-sm text-emerald-800">
            Added <strong>{added.fullName || added.email}</strong> ({added.email}).
          </p>
          <p className="mt-2 text-sm text-slate-700">
            Access code:{" "}
            <code className="rounded bg-white px-2 py-1 font-mono text-sm text-slate-800">{added.accessCode}</code>{" "}
            <button type="button" onClick={copyCode} className="text-xs font-medium text-brand hover:underline">
              {copied ? "Copied" : "Copy"}
            </button>
          </p>
          <p className="mt-1 text-xs text-slate-500">
            This is shown once. It&apos;s also on the candidate&apos;s dashboard row, and you can email it from there
            with &ldquo;Send / Resend Code by Email&rdquo;.
          </p>
        </div>
      )}
    </div>
  );
}
