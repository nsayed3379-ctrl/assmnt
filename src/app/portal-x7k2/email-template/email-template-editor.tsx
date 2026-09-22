"use client";

import { useMemo, useState } from "react";
import {
  INVITATION_TEMPLATE_HELP,
  SAMPLE_INVITATION_VARS,
  emailShellHtml,
  renderEmailBodyHtml,
  renderEmailSubject,
} from "@/lib/emailTemplate";

export default function EmailTemplateEditor({
  initialSubject,
  initialBody,
}: {
  initialSubject: string;
  initialBody: string;
}) {
  const [subject, setSubject] = useState(initialSubject);
  const [body, setBody] = useState(initialBody);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [savedAt, setSavedAt] = useState<Date | null>(null);

  const previewSubject = useMemo(() => renderEmailSubject(subject, SAMPLE_INVITATION_VARS), [subject]);
  const previewHtml = useMemo(
    () => emailShellHtml(renderEmailBodyHtml(body, SAMPLE_INVITATION_VARS)),
    [body]
  );
  const previewDoc = useMemo(
    () => `<!doctype html><html><head><meta charset="utf-8"/></head><body style="margin:0;padding:24px;background:#f8fafc;">${previewHtml}</body></html>`,
    [previewHtml]
  );

  const dirty = subject !== initialSubject || body !== initialBody;

  async function handleSave() {
    setSaving(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/email-template", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ subject, body }),
      });
      const result = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(result.error || "Could not save the template.");
      setSavedAt(new Date());
    } catch (err: any) {
      setError(err.message || "Could not save the template.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="text-sm font-semibold text-slate-900">Edit</h2>

        <label className="mt-4 block text-sm font-medium text-slate-700">Subject</label>
        <input
          type="text"
          value={subject}
          onChange={(e) => setSubject(e.target.value)}
          className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
        />

        <label className="mt-4 block text-sm font-medium text-slate-700">Body</label>
        <textarea
          value={body}
          onChange={(e) => setBody(e.target.value)}
          rows={20}
          className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 font-mono text-xs leading-relaxed"
        />
        <p className="mt-2 text-xs text-slate-500">{INVITATION_TEMPLATE_HELP}</p>

        {error && <p className="mt-2 text-sm text-red-600">{error}</p>}

        <div className="mt-4 flex items-center gap-3">
          <button
            type="button"
            onClick={handleSave}
            disabled={saving || !dirty || !subject.trim() || !body.trim()}
            className="rounded-lg bg-brand px-4 py-2 text-sm font-medium text-white hover:bg-brand-dark disabled:opacity-60"
          >
            {saving ? "Saving..." : "Save Template"}
          </button>
          {!dirty && savedAt && <span className="text-xs text-emerald-600">Saved at {savedAt.toLocaleTimeString()}</span>}
          {dirty && <span className="text-xs text-slate-400">Unsaved changes</span>}
        </div>
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="text-sm font-semibold text-slate-900">Preview</h2>
        <p className="mt-1 text-xs text-slate-500">
          Rendered with sample data - real emails substitute the actual candidate&apos;s assessment, access code, and
          link.
        </p>

        <div className="mt-4 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm">
          <span className="text-slate-400">Subject: </span>
          <span className="font-medium text-slate-800">{previewSubject}</span>
        </div>

        <iframe
          title="Email preview"
          srcDoc={previewDoc}
          className="mt-3 h-[560px] w-full rounded-lg border border-slate-200"
        />
      </div>
    </div>
  );
}
