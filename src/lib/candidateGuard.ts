import { supabaseAdmin } from "./supabaseAdmin";
import { getCandidateSession, type CandidateSessionPayload } from "./candidateAuth";

export type ActiveInviteContext = {
  session: CandidateSessionPayload;
  invite: { id: string; assessment_id: string; submitted_at: string | null; expires_at: string | null };
};

/**
 * Loads the current candidate session and confirms their invite hasn't been
 * finally submitted yet. Every write endpoint (draft save, upload, mark task
 * complete, integrity log) should call this first - once submitted_at is
 * set, nothing about the assessment can be edited again.
 *
 * Also enforces expires_at by default: once the server-computed deadline has
 * passed, writes are rejected the same way. Pass `enforceExpiry: false` only
 * for the final-submit endpoint itself, so a candidate who ran out of time
 * can still close out with whatever they have instead of being locked out
 * of submitting entirely.
 */
export async function requireActiveInvite(
  { enforceExpiry = true }: { enforceExpiry?: boolean } = {}
): Promise<ActiveInviteContext | { error: string; status: number }> {
  const session = await getCandidateSession();
  if (!session) return { error: "Not authorized.", status: 401 };

  const { data: invite } = await supabaseAdmin()
    .from("assessment_invites")
    .select("id, assessment_id, submitted_at, expires_at")
    .eq("id", session.inviteId)
    .single();

  if (!invite) return { error: "Assessment not found.", status: 404 };
  if (invite.submitted_at) return { error: "This assessment has already been submitted.", status: 409 };
  if (enforceExpiry && invite.expires_at && Date.now() > new Date(invite.expires_at).getTime()) {
    return { error: "Time is up for this assessment. Please use Final Submit on your dashboard.", status: 409 };
  }

  return { session, invite };
}
