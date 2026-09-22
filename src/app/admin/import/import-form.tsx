"use client";

import { useState } from "react";

type Assessment = { id: string; title: string; status: string };
type PreviewRow = { email: string; fullName: string | null; position: string | null };
type PreviewResult = {
  readyToImport: PreviewRow[];
  alreadyImported: string[];
  invalidEmail: { rowNumber: number; raw: unknown }[];
  duplicatesInFile: { rowNumber: number; email: string }[];
  totalRows: number;
};

export default function ImportForm({ assessments }: { assessments: Assessment[] }) {
  const [assessmentId, setAssessmentId] = useState(assessments[0]?.id || "");
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<PreviewResult | null>(null);
  const [importResult, setImportResult] = useState<{ imported: number; failures: any[] } | null>(null);
  const [sendResult, setSendResult] = useState<{ sent: number; failed: number } | null>(null);
  const [loading, setLoading] = useState<"preview" | "import" | "send" | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [confirmingSend, setConfirmingSend] = useState(false);
  const [sendAck, setSendAck] = useState(false);

  async function handlePreview() {
    if (!file || !assessmentId) {
      setError("Choose an assessment and a file first.");
      return;
    }
    setError(null);
    setLoading("preview");
    setPreview(null);
    setImportResult(null);
    try {
      const formData = new FormData();
      formData.set("assessmentId", assessmentId);
      formData.set("file", file);
      const res = await fetch("/api/admin/import/preview", { method: "POST", body: formData });
      const body = await res.json();
      if (!res.ok) throw new Error(body.error || "Preview failed.");
      setPreview(body);
    } catch (err: any) {
      setError(err.message || "Preview failed.");
    } finally {
      setLoading(null);
    }
  }

  async function handleImport() {
    if (!preview) return;
    setLoading("import");
    setError(null);
    try {
      const res = await fetch("/api/admin/import/confirm", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ assessmentId, rows: preview.readyToImport }),
      });
      const body = await res.json();
      if (!res.ok) throw new Error(body.error || "Import failed.");
      setImportResult(body);
    } catch (err: any) {
      setError(err.message || "Import failed.");
    } finally {
      setLoading(null);
    }
  }

  async function handleSend() {
    if (!sendAck) return;
    setLoading("send");
    setError(null);
    try {
      const res = await fetch("/api/admin/send-invitations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ assessmentId }),
      });
      const body = await res.json();
      if (!res.ok) throw new Error(body.error || "Sending failed.");
      setSendResult(body);
      setConfirmingSend(false);
      setSendAck(false);
    } catch (err: any) {
      setError(err.message || "Sending failed.");
    } finally {
      setLoading(null);
    }
  }

  return (
    <div className="mt-6 space-y-6">
      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <label className="block text-sm font-medium text-slate-700">Assessment</label>
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

        <label className="mt-4 block text-sm font-medium text-slate-700">Excel file (.xlsx)</label>
        <input
          type="file"
          accept=".xlsx,.xls"
          onChange={(e) => setFile(e.target.files?.[0] || null)}
          className="mt-1 w-full text-sm"
        />

        {error && <p className="mt-2 text-sm text-red-600">{error}</p>}

        <button
          onClick={handlePreview}
          disabled={loading !== null || !file || !assessmentId}
          className="mt-4 rounded-lg bg-brand px-4 py-2 text-sm font-medium text-white hover:bg-brand-dark disabled:opacity-60"
        >
          {loading === "preview" ? "Reading..." : "Preview"}
        </button>
      </div>

      {preview && !importResult && (
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <p className="text-sm text-slate-700">
            Found {preview.totalRows} row(s) &mdash; <strong>{preview.readyToImport.length}</strong> ready to import,{" "}
            {preview.alreadyImported.length} already invited, {preview.duplicatesInFile.length} duplicate(s) in file,{" "}
            {preview.invalidEmail.length} invalid email(s).
          </p>

          {preview.readyToImport.length > 0 && (
            <div className="mt-3 max-h-48 overflow-y-auto rounded-lg border border-slate-100 text-sm">
              <table className="min-w-full">
                <tbody>
                  {preview.readyToImport.map((row, i) => (
                    <tr key={i} className="border-b border-slate-50 last:border-0">
                      <td className="px-3 py-1.5 text-slate-700">{row.email}</td>
                      <td className="px-3 py-1.5 text-slate-400">{row.fullName || "-"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          <button
            onClick={handleImport}
            disabled={loading !== null || preview.readyToImport.length === 0}
            className="mt-4 rounded-lg bg-brand px-4 py-2 text-sm font-medium text-white hover:bg-brand-dark disabled:opacity-60"
          >
            {loading === "import" ? "Importing..." : `Import ${preview.readyToImport.length} Candidates`}
          </button>
        </div>
      )}

      {importResult && (
        <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-6">
          <p className="text-sm text-emerald-800">
            Imported {importResult.imported} candidate(s)
            {importResult.failures.length > 0 && `, ${importResult.failures.length} failed`}.
          </p>

          {!sendResult ? (
            <div className="mt-4 rounded-lg border border-amber-200 bg-amber-50 p-4">
              <p className="text-sm text-amber-800">
                This will email every candidate on this assessment who hasn't been sent an invitation yet
                (including any imported in earlier sessions, not just the batch above). This cannot be undone.
              </p>

              {!confirmingSend ? (
                <button
                  onClick={() => setConfirmingSend(true)}
                  disabled={loading !== null}
                  className="mt-3 rounded-lg bg-brand px-4 py-2 text-sm font-medium text-white hover:bg-brand-dark disabled:opacity-60"
                >
                  Send Invitations
                </button>
              ) : (
                <div className="mt-3 rounded-lg border border-red-200 bg-red-50 p-3">
                  <label className="flex items-start gap-2 text-sm text-red-800">
                    <input
                      type="checkbox"
                      checked={sendAck}
                      onChange={(e) => setSendAck(e.target.checked)}
                      className="mt-0.5"
                    />
                    I understand this will send real emails right now and cannot be undone.
                  </label>
                  <div className="mt-3 flex gap-2">
                    <button
                      onClick={handleSend}
                      disabled={loading !== null || !sendAck}
                      className="rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-50"
                    >
                      {loading === "send" ? "Sending..." : "Yes, Send Invitations Now"}
                    </button>
                    <button
                      onClick={() => {
                        setConfirmingSend(false);
                        setSendAck(false);
                      }}
                      disabled={loading !== null}
                      className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <p className="mt-3 text-sm text-slate-700">
              Sent {sendResult.sent} invitation(s){sendResult.failed > 0 && `, ${sendResult.failed} failed`}.
            </p>
          )}
        </div>
      )}
    </div>
  );
}
