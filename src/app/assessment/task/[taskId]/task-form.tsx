"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import type { McqOption, TaskField, TaskType } from "@/lib/database.types";

type ExistingSubmission = {
  content: string | null;
  github_url: string | null;
  live_url: string | null;
  file_path: string | null;
  status: "draft" | "submitted";
} | null;

type Props = {
  taskId: string;
  taskType: TaskType;
  options: McqOption[] | null;
  existing: ExistingSubmission;
  logIntegrityEvents: boolean;
  existingFileName: string | null;
  /** When set (non-empty), one task collects multiple submission pieces - see database.types.ts. */
  fields?: TaskField[] | null;
};

const TEXT_TYPES: TaskType[] = ["short_answer", "long_answer"];

export default function TaskForm({
  taskId,
  taskType,
  options,
  existing,
  logIntegrityEvents,
  existingFileName,
  fields,
}: Props) {
  const multiField = fields && fields.length > 0 ? fields : null;
  const router = useRouter();
  const [content, setContent] = useState(existing?.content || "");
  const [githubUrl, setGithubUrl] = useState(existing?.github_url || "");
  const [liveUrl, setLiveUrl] = useState(existing?.live_url || "");
  const [file, setFile] = useState<File | null>(null);
  const [uploadedName, setUploadedName] = useState(existingFileName);
  const [saveState, setSaveState] = useState<"idle" | "saving" | "saved">("idle");
  const [error, setError] = useState<string | null>(null);
  const [completing, setCompleting] = useState(false);
  const [isComplete, setIsComplete] = useState(existing?.status === "submitted");
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Tab-switch logging only makes sense for text-based tasks, where leaving
  // the tab to look something up is a meaningful signal. For github_url /
  // link_submission / file_upload tasks, candidates are expected to work in
  // an external editor and switch tabs constantly - logging that there
  // would just be noise, so it's skipped entirely for those types.
  useEffect(() => {
    if (!logIntegrityEvents || !TEXT_TYPES.includes(taskType)) return;
    function handleVisibility() {
      if (document.visibilityState === "hidden") {
        fetch("/api/candidate/integrity", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ taskId, eventType: "tab_switch" }),
        }).catch(() => {});
      }
    }
    document.addEventListener("visibilitychange", handleVisibility);
    return () => document.removeEventListener("visibilitychange", handleVisibility);
  }, [logIntegrityEvents, taskType, taskId]);

  async function saveDraft(next: { content?: string; githubUrl?: string; liveUrl?: string }) {
    setSaveState("saving");
    try {
      const res = await fetch("/api/candidate/draft", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          taskId,
          submissionType: taskType,
          content: next.content ?? content,
          githubUrl: next.githubUrl ?? githubUrl,
          liveUrl: next.liveUrl ?? liveUrl,
        }),
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(body.error || "Could not save draft.");
      setError(null);
      setSaveState("saved");
    } catch (err: any) {
      // Surfaced (e.g. "Time is up...") rather than failing silently, since
      // a candidate relying on autosave needs to know it stopped working.
      setError(err.message || "Could not save draft.");
      setSaveState("idle");
    }
  }

  function scheduleSave(next: { content?: string; githubUrl?: string; liveUrl?: string }) {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => saveDraft(next), 1000);
  }

  async function handleMcqSelect(optionId: string) {
    setContent(optionId);
    await saveDraft({ content: optionId });
  }

  async function handleUpload() {
    if (!file) return;
    setError(null);
    setSaveState("saving");
    try {
      const formData = new FormData();
      formData.set("taskId", taskId);
      formData.set("file", file);
      const res = await fetch("/api/candidate/upload", { method: "POST", body: formData });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(body.error || "Upload failed.");
      setUploadedName(body.fileName);
      setSaveState("saved");
    } catch (err: any) {
      setError(err.message || "Upload failed.");
      setSaveState("idle");
    }
  }

  async function handleMarkComplete() {
    setCompleting(true);
    setError(null);
    try {
      const res = await fetch("/api/candidate/submit-task", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ taskId }),
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(body.error || "Could not mark complete.");
      setIsComplete(true);
      router.refresh();
    } catch (err: any) {
      setError(err.message || "Could not mark complete.");
    } finally {
      setCompleting(false);
    }
  }

  function renderFieldByType(type: TaskType) {
    switch (type) {
      case "mcq":
        return (
          <div className="space-y-2">
            {(options || []).map((opt) => (
              <label
                key={opt.id}
                className={`flex cursor-pointer items-center gap-3 rounded-lg border px-4 py-3 text-sm ${
                  content === opt.id ? "border-brand bg-brand/5" : "border-slate-200"
                }`}
              >
                <input
                  type="radio"
                  name="mcq"
                  checked={content === opt.id}
                  onChange={() => handleMcqSelect(opt.id)}
                  className="h-4 w-4"
                />
                {opt.label}
              </label>
            ))}
          </div>
        );
      case "short_answer":
        return (
          <input
            type="text"
            value={content}
            onChange={(e) => {
              setContent(e.target.value);
              scheduleSave({ content: e.target.value });
            }}
            placeholder="Your answer"
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-brand focus:outline-none focus:ring-1 focus:ring-brand"
          />
        );
      case "long_answer":
        return (
          <textarea
            value={content}
            onChange={(e) => {
              setContent(e.target.value);
              scheduleSave({ content: e.target.value });
            }}
            rows={8}
            placeholder="Your answer"
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-brand focus:outline-none focus:ring-1 focus:ring-brand"
          />
        );
      case "github_url":
        return (
          <input
            type="url"
            value={githubUrl}
            onChange={(e) => {
              setGithubUrl(e.target.value);
              scheduleSave({ githubUrl: e.target.value });
            }}
            placeholder="https://github.com/you/repo"
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-brand focus:outline-none focus:ring-1 focus:ring-brand"
          />
        );
      case "link_submission":
        return (
          <input
            type="url"
            value={liveUrl}
            onChange={(e) => {
              setLiveUrl(e.target.value);
              scheduleSave({ liveUrl: e.target.value });
            }}
            placeholder="https://your-link.example.com"
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-brand focus:outline-none focus:ring-1 focus:ring-brand"
          />
        );
      case "file_upload":
        return (
          <div className="space-y-2">
            {uploadedName && <p className="text-sm text-emerald-600">Uploaded: {uploadedName}</p>}
            <input type="file" onChange={(e) => setFile(e.target.files?.[0] || null)} className="w-full text-sm" />
            <button
              type="button"
              onClick={handleUpload}
              disabled={!file}
              className="rounded-lg border border-slate-300 px-4 py-2 text-sm hover:bg-slate-50 disabled:opacity-50"
            >
              Upload File
            </button>
          </div>
        );
      default:
        return null;
    }
  }

  function hasValueFor(type: TaskType): boolean {
    switch (type) {
      case "github_url":
        return !!githubUrl.trim();
      case "link_submission":
        return !!liveUrl.trim();
      case "file_upload":
        return !!uploadedName;
      default:
        return !!content.trim();
    }
  }

  const missingRequired = multiField ? multiField.filter((f) => f.required && !hasValueFor(f.type)) : [];

  return (
    <div className="mt-6 space-y-4 border-t border-slate-100 pt-6">
      {multiField ? (
        <div className="space-y-5">
          {multiField.map((f) => (
            <div key={f.key}>
              <label className="mb-1.5 block text-sm font-medium text-slate-700">
                {f.label}
                {f.required && <span className="ml-1 text-red-500">*</span>}
              </label>
              {renderFieldByType(f.type)}
            </div>
          ))}
        </div>
      ) : (
        renderFieldByType(taskType)
      )}

      <div className="flex items-center justify-between text-xs text-slate-400">
        <span>
          {saveState === "saving" && "Saving..."}
          {saveState === "saved" && `Autosaved`}
        </span>
      </div>

      {error && <p className="text-sm text-red-600">{error}</p>}

      {missingRequired.length > 0 && (
        <p className="text-xs text-slate-400">Still needed: {missingRequired.map((f) => f.label).join(", ")}</p>
      )}

      <button
        onClick={handleMarkComplete}
        disabled={completing}
        className={`w-full rounded-lg px-4 py-2.5 text-sm font-medium disabled:opacity-60 ${
          isComplete ? "bg-emerald-50 text-emerald-700 border border-emerald-200" : "bg-brand text-white hover:bg-brand-dark"
        }`}
      >
        {completing ? "Saving..." : isComplete ? "Marked Complete - click to re-save" : "Mark Task Complete"}
      </button>
    </div>
  );
}
