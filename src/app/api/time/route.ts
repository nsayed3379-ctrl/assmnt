import { NextResponse } from "next/server";

// Lets the client compute an offset between its own clock and the server's,
// so the countdown displayed to the candidate is accurate even if their
// system clock is wrong. The value actually enforced (duration used for
// review) always comes from started_at/submitted_at in the database, never
// from anything the client reports.
export async function GET() {
  return NextResponse.json({ now: Date.now() });
}
