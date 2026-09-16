import { createHmac, timingSafeEqual } from "crypto";
import { cookies } from "next/headers";

const COOKIE_NAME = "vecosoft_admin_session";

function secret() {
  return process.env.ADMIN_SESSION_SECRET || "dev-only-insecure-secret";
}

function sign(value: string) {
  return createHmac("sha256", secret()).update(value).digest("hex");
}

// The session token is "<issuedAt>.<hmac>" so it can be verified without a
// database lookup. It carries no identity beyond "knows the admin password
// at issue time" - fine for a small internal hiring tool, not a substitute
// for real multi-user auth if this grows past one admin.
export function createAdminSessionToken() {
  const issuedAt = Date.now().toString();
  return `${issuedAt}.${sign(issuedAt)}`;
}

export function isValidAdminToken(token: string | undefined | null) {
  if (!token) return false;
  const [issuedAt, mac] = token.split(".");
  if (!issuedAt || !mac) return false;

  const expected = sign(issuedAt);
  const a = Buffer.from(mac);
  const b = Buffer.from(expected);
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}

export function getAdminCookieName() {
  return COOKIE_NAME;
}

export async function isAdminRequestAuthed() {
  const store = await cookies();
  const token = store.get(COOKIE_NAME)?.value;
  return isValidAdminToken(token);
}
