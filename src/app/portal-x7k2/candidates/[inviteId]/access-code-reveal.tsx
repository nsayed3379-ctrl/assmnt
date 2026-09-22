"use client";

import { useState } from "react";

export default function AccessCodeReveal({ code }: { code: string }) {
  const [revealed, setRevealed] = useState(false);
  const [copied, setCopied] = useState(false);

  async function copy() {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      // clipboard API can be unavailable (e.g. insecure context) - not worth surfacing
    }
  }

  return (
    <span className="inline-flex items-center gap-2">
      <code className="rounded bg-slate-100 px-2 py-1 font-mono text-sm text-slate-800">
        {revealed ? code : "••••-••••-••••"}
      </code>
      <button type="button" onClick={() => setRevealed((r) => !r)} className="text-xs font-medium text-brand hover:underline">
        {revealed ? "Hide" : "Show"}
      </button>
      <button type="button" onClick={copy} className="text-xs font-medium text-brand hover:underline">
        {copied ? "Copied" : "Copy"}
      </button>
    </span>
  );
}
