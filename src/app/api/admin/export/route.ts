import { NextRequest, NextResponse } from "next/server";
import { requireAdminRole } from "@/lib/auth";
import { fetchCandidateList } from "@/lib/adminData";
import { formatDateTime, formatDuration, STATUS_LABELS } from "@/lib/format";

function csvEscape(value: string) {
  if (/[",\n]/.test(value)) return `"${value.replace(/"/g, '""')}"`;
  return value;
}

export async function GET(req: NextRequest) {
  const session = await requireAdminRole(["super_admin", "hr", "reviewer"]);
  if (!session) return NextResponse.json({ error: "Not authorized." }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const assessmentId = searchParams.get("assessmentId") || undefined;
  const status = searchParams.get("status") || undefined;
  const search = searchParams.get("q") || undefined;

  const rows = await fetchCandidateList({ assessmentId, status, search });

  // Deliberately no access code column here: a bulk CSV of every
  // candidate's working code is a much bigger exposure than viewing one at
  // a time in the authenticated admin UI. Use the candidate detail page.
  const header = [
    "Name",
    "Email",
    "Candidate ID",
    "Assessment",
    "Status",
    "Started",
    "Submitted",
    "Duration",
    "Score",
    "Max Score",
    "Integrity Flags",
  ];
  const lines = [header.join(",")];

  for (const row of rows) {
    lines.push(
      [
        row.fullName || "",
        row.email,
        row.inviteId,
        row.assessmentTitle,
        STATUS_LABELS[row.status] || row.status,
        formatDateTime(row.startedAt),
        formatDateTime(row.submittedAt),
        formatDuration(row.startedAt, row.submittedAt),
        row.scoreEarned ?? "",
        row.scoreMax ?? "",
        row.integrityFlags,
      ]
        .map((v) => csvEscape(String(v)))
        .join(",")
    );
  }

  return new NextResponse(lines.join("\n"), {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="vecosoft-candidates.csv"`,
    },
  });
}
