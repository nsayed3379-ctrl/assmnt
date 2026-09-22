"use client";

import { useRef } from "react";

type Props = {
  children: React.ReactNode;
  watermarkText: string;
  taskId: string;
  logIntegrityEvents: boolean;
};

/**
 * Wraps task instructions with copy/right-click deterrents and a faint
 * tiled watermark. This does NOT stop screenshots (no website can), but it
 * blocks casual copy-paste and, if a screenshot does leak, the watermark
 * traces it back to the candidate/session it came from.
 */
export default function ProtectedText({ children, watermarkText, taskId, logIntegrityEvents }: Props) {
  const lastLogged = useRef<Record<string, number>>({});

  function report(eventType: "copy_attempt" | "right_click_attempt") {
    if (!logIntegrityEvents) return;
    const now = Date.now();
    const last = lastLogged.current[eventType] || 0;
    if (now - last < 3000) return; // throttle - don't flood on repeated attempts
    lastLogged.current[eventType] = now;
    fetch("/api/candidate/integrity", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ taskId, eventType }),
    }).catch(() => {});
  }

  const watermarkTiles = Array.from({ length: 48 }, (_, i) => i);

  return (
    <div
      className="relative select-none overflow-hidden rounded-lg border border-slate-100 bg-slate-50 p-4"
      onCopy={(e) => {
        e.preventDefault();
        report("copy_attempt");
      }}
      onCut={(e) => {
        e.preventDefault();
        report("copy_attempt");
      }}
      onContextMenu={(e) => {
        e.preventDefault();
        report("right_click_attempt");
      }}
      style={{ WebkitUserSelect: "none", userSelect: "none" }}
    >
      <div className="pointer-events-none absolute inset-0 z-10 flex flex-wrap content-start gap-x-8 gap-y-8 overflow-hidden opacity-[0.07]">
        {watermarkTiles.map((i) => (
          <span key={i} className="-rotate-[24deg] whitespace-nowrap text-xs font-medium text-slate-900">
            {watermarkText}
          </span>
        ))}
      </div>
      <div className="relative z-0 text-sm text-slate-700">{children}</div>
    </div>
  );
}
