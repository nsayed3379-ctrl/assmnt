"use client";

import { useEffect, useMemo, useState } from "react";

function formatClock(ms: number) {
  const sign = ms < 0 ? "-" : "";
  const abs = Math.abs(ms);
  const totalSeconds = Math.floor(abs / 1000);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  const mm = minutes.toString().padStart(2, "0");
  const ss = seconds.toString().padStart(2, "0");
  return hours > 0 ? `${sign}${hours}:${mm}:${ss}` : `${sign}${minutes}:${ss}`;
}

/**
 * Displays a countdown to `expiresAt`, corrected for the candidate's device
 * clock being wrong (fetches server time once). This is a UX nicety only -
 * nothing here is trusted for actually enforcing the deadline; that always
 * happens server-side against started_at/expires_at in the database.
 */
export default function TimerBadge({ expiresAt }: { expiresAt: string }) {
  const deadline = useMemo(() => new Date(expiresAt).getTime(), [expiresAt]);
  const [clockOffset, setClockOffset] = useState(0);
  // Stays null until mounted: the server and the client's first render
  // happen at different instants, so calling Date.now() during either of
  // them (as this used to) makes the rendered digits disagree - a
  // hydration mismatch. Rendering a fixed placeholder until the
  // post-mount effect sets the real value keeps SSR and the client's
  // first render identical.
  const [now, setNow] = useState<number | null>(null);

  useEffect(() => {
    setNow(Date.now());

    fetch("/api/time")
      .then((r) => r.json())
      .then((d) => setClockOffset(d.now - Date.now()))
      .catch(() => setClockOffset(0));

    const interval = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(interval);
  }, []);

  if (now === null) {
    return <div className="rounded-full px-3 py-1 text-sm font-mono font-medium bg-brand/10 text-brand">--:--</div>;
  }

  const remainingMs = deadline - (now + clockOffset);
  const isOvertime = remainingMs < 0;

  return (
    <div
      className={`rounded-full px-3 py-1 text-sm font-mono font-medium ${
        isOvertime ? "bg-red-100 text-red-700" : "bg-brand/10 text-brand"
      }`}
    >
      {formatClock(remainingMs)}
    </div>
  );
}
