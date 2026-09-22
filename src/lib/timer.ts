/**
 * Computes when a candidate's session expires once they click Start.
 * If the assessment has a hard deadline, the candidate gets whichever is
 * SHORTER: their full duration, or the time remaining until that deadline.
 * This is explained to the candidate before they start, not sprung on them.
 */
export function computeExpiresAt(startedAt: Date, durationMinutes: number, hardDeadline: string | null): Date {
  const durationExpiry = new Date(startedAt.getTime() + durationMinutes * 60 * 1000);
  if (!hardDeadline) return durationExpiry;

  const deadline = new Date(hardDeadline);
  return deadline.getTime() < durationExpiry.getTime() ? deadline : durationExpiry;
}
