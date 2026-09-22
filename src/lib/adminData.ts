import { supabaseAdmin } from "./supabaseAdmin";
import type { InviteStatus } from "./database.types";

export type CandidateListRow = {
  inviteId: string;
  email: string;
  fullName: string | null;
  accessCodeLast4: string | null;
  assessmentId: string;
  assessmentTitle: string;
  status: string;
  startedAt: string | null;
  submittedAt: string | null;
  scoreEarned: number | null;
  scoreMax: number | null;
  integrityFlags: number;
};

export type CandidateListFilters = {
  assessmentId?: string;
  status?: string;
  /** Matched against candidate name, email, and invite (candidate) id - case-insensitive substring. */
  search?: string;
};

export async function fetchCandidateList(filters: CandidateListFilters): Promise<CandidateListRow[]> {
  const db = supabaseAdmin();

  let query = db
    .from("assessment_invites")
    .select("id, candidate_id, assessment_id, status, started_at, submitted_at, access_code_last4")
    .order("created_at", { ascending: false });

  if (filters.assessmentId) query = query.eq("assessment_id", filters.assessmentId);
  if (filters.status) query = query.eq("status", filters.status as InviteStatus);

  const { data: invites } = await query;
  if (!invites || invites.length === 0) return [];

  const inviteIds = invites.map((i) => i.id);
  const candidateIds = [...new Set(invites.map((i) => i.candidate_id))];
  const assessmentIds = [...new Set(invites.map((i) => i.assessment_id))];

  const [{ data: candidates }, { data: assessments }, { data: submissions }, { data: integrityEvents }] =
    await Promise.all([
      db.from("candidates").select("id, email, full_name").in("id", candidateIds),
      db.from("assessments").select("id, title").in("id", assessmentIds),
      db.from("submissions").select("id, invite_id").in("invite_id", inviteIds),
      db.from("integrity_events").select("invite_id, event_count").in("invite_id", inviteIds),
    ]);

  const candidateById = new Map((candidates || []).map((c) => [c.id, c]));
  const assessmentById = new Map((assessments || []).map((a) => [a.id, a]));
  const submissionIds = (submissions || []).map((s) => s.id);
  const submissionToInvite = new Map((submissions || []).map((s) => [s.id, s.invite_id]));

  const { data: scores } = submissionIds.length
    ? await db.from("evaluation_scores").select("submission_id, score, max_score").in("submission_id", submissionIds)
    : { data: [] as { submission_id: string; score: number; max_score: number }[] };

  const scoreByInvite = new Map<string, { earned: number; max: number }>();
  for (const s of scores || []) {
    const inviteId = submissionToInvite.get(s.submission_id);
    if (!inviteId) continue;
    const agg = scoreByInvite.get(inviteId) || { earned: 0, max: 0 };
    agg.earned += Number(s.score);
    agg.max += Number(s.max_score);
    scoreByInvite.set(inviteId, agg);
  }

  const integrityByInvite = new Map<string, number>();
  for (const ev of integrityEvents || []) {
    integrityByInvite.set(ev.invite_id, (integrityByInvite.get(ev.invite_id) || 0) + (ev.event_count || 1));
  }

  const rows = invites.map((invite) => {
    const candidate = candidateById.get(invite.candidate_id);
    const assessment = assessmentById.get(invite.assessment_id);
    const score = scoreByInvite.get(invite.id);
    return {
      inviteId: invite.id,
      email: candidate?.email || "",
      fullName: candidate?.full_name || null,
      accessCodeLast4: invite.access_code_last4 || null,
      assessmentId: invite.assessment_id,
      assessmentTitle: assessment?.title || "",
      status: invite.status,
      startedAt: invite.started_at,
      submittedAt: invite.submitted_at,
      scoreEarned: score ? score.earned : null,
      scoreMax: score ? score.max : null,
      integrityFlags: integrityByInvite.get(invite.id) || 0,
    };
  });

  const search = filters.search?.trim().toLowerCase();
  if (!search) return rows;

  // Dataset is small (README: "50-500 candidate hiring round"), so an
  // in-memory filter here is simpler and safer than a cross-table SQL
  // search - name/email live on `candidates`, not `assessment_invites`.
  return rows.filter(
    (row) =>
      row.email.toLowerCase().includes(search) ||
      (row.fullName || "").toLowerCase().includes(search) ||
      row.inviteId.toLowerCase().includes(search)
  );
}
