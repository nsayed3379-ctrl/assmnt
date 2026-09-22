"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { STATUS_LABELS, STATUS_STYLES, STATUS_OPTIONS } from "@/lib/format";

export default function InviteStatusSelect({ inviteId, status }: { inviteId: string; status: string }) {
  const router = useRouter();
  const [current, setCurrent] = useState(status);
  const [saving, setSaving] = useState(false);

  async function handleChange(next: string) {
    setSaving(true);
    const prev = current;
    setCurrent(next);
    try {
      const res = await fetch("/api/admin/status", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ inviteId, status: next }),
      });
      if (!res.ok) throw new Error();
      router.refresh();
    } catch {
      setCurrent(prev);
    } finally {
      setSaving(false);
    }
  }

  return (
    <select
      value={current}
      disabled={saving}
      onChange={(e) => handleChange(e.target.value)}
      onClick={(e) => e.stopPropagation()}
      className={`rounded-full border-0 px-2.5 py-1 text-xs font-medium ${STATUS_STYLES[current] || "bg-slate-100 text-slate-600"}`}
    >
      {STATUS_OPTIONS.map((o) => (
        <option key={o} value={o}>
          {STATUS_LABELS[o]}
        </option>
      ))}
    </select>
  );
}
