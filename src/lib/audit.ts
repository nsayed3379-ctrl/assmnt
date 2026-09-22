import { supabaseAdmin } from "./supabaseAdmin";

type ActorType = "admin" | "candidate" | "system";

/**
 * Best-effort audit trail. Never let a logging failure break the request it
 * describes - log the error and move on.
 */
export async function logAudit(
  actorType: ActorType,
  actorId: string | null,
  action: string,
  target?: string,
  metadata?: Record<string, unknown>
) {
  try {
    await supabaseAdmin()
      .from("audit_logs")
      .insert({ actor_type: actorType, actor_id: actorId, action, target: target ?? null, metadata: metadata ?? null });
  } catch (err) {
    console.error("audit log failed", action, err);
  }
}
