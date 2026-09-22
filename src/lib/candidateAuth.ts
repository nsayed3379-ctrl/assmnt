import { createHmac, timingSafeEqual } from "crypto";
import { cookies } from "next/headers";

const COOKIE_NAME = "vecosoft_candidate_session";
const SESSION_TTL_MS = 24 * 60 * 60 * 1000; // 24 hours - generous; server still checks expires_at/submitted_at per request

export type CandidateSessionPayload = {
  inviteId: string;
  candidateId: string;
  email: string;
  iat: number;
};

function secret() {
  return process.env.ADMIN_SESSION_SECRET || "dev-only-insecure-secret";
}

function base64url(input: string) {
  return Buffer.from(input, "utf8").toString("base64url");
}

function sign(payloadB64: string) {
  return createHmac("sha256", secret() + ":candidate").update(payloadB64).digest("hex");
}

export function createCandidateSessionToken(payload: Omit<CandidateSessionPayload, "iat">) {
  const full: CandidateSessionPayload = { ...payload, iat: Date.now() };
  const body = base64url(JSON.stringify(full));
  return `${body}.${sign(body)}`;
}

export function parseCandidateSessionToken(token: string | undefined | null): CandidateSessionPayload | null {
  if (!token) return null;
  const [body, mac] = token.split(".");
  if (!body || !mac) return null;

  const expected = sign(body);
  const a = Buffer.from(mac);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !timingSafeEqual(a, b)) return null;

  try {
    const payload = JSON.parse(Buffer.from(body, "base64url").toString("utf8")) as CandidateSessionPayload;
    if (Date.now() - payload.iat > SESSION_TTL_MS) return null;
    return payload;
  } catch {
    return null;
  }
}

export function getCandidateCookieName() {
  return COOKIE_NAME;
}

export async function getCandidateSession(): Promise<CandidateSessionPayload | null> {
  const store = await cookies();
  return parseCandidateSessionToken(store.get(COOKIE_NAME)?.value);
}
