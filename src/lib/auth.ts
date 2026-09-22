import { createHmac, timingSafeEqual } from "crypto";
import { cookies } from "next/headers";
import type { AdminRole } from "./database.types";

const COOKIE_NAME = "vecosoft_admin_session";
const SESSION_TTL_MS = 12 * 60 * 60 * 1000; // 12 hours

export type AdminSessionPayload = {
  id: string;
  email: string;
  role: AdminRole;
  iat: number;
};

function secret() {
  return process.env.ADMIN_SESSION_SECRET || "dev-only-insecure-secret";
}

function base64url(input: string) {
  return Buffer.from(input, "utf8").toString("base64url");
}

function sign(payloadB64: string) {
  return createHmac("sha256", secret()).update(payloadB64).digest("hex");
}

/** "<base64url(json)>.<hmac>" - stateless, no DB lookup needed to verify a request. */
export function createAdminSessionToken(payload: Omit<AdminSessionPayload, "iat">) {
  const full: AdminSessionPayload = { ...payload, iat: Date.now() };
  const body = base64url(JSON.stringify(full));
  return `${body}.${sign(body)}`;
}

export function parseAdminSessionToken(token: string | undefined | null): AdminSessionPayload | null {
  if (!token) return null;
  const [body, mac] = token.split(".");
  if (!body || !mac) return null;

  const expected = sign(body);
  const a = Buffer.from(mac);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !timingSafeEqual(a, b)) return null;

  try {
    const payload = JSON.parse(Buffer.from(body, "base64url").toString("utf8")) as AdminSessionPayload;
    if (Date.now() - payload.iat > SESSION_TTL_MS) return null;
    return payload;
  } catch {
    return null;
  }
}

export function isValidAdminToken(token: string | undefined | null) {
  return parseAdminSessionToken(token) !== null;
}

export function getAdminCookieName() {
  return COOKIE_NAME;
}

export async function getAdminSession(): Promise<AdminSessionPayload | null> {
  const store = await cookies();
  return parseAdminSessionToken(store.get(COOKIE_NAME)?.value);
}

/** Returns the session if the caller's role is allowed, otherwise null. */
export async function requireAdminRole(allowed: AdminRole[]): Promise<AdminSessionPayload | null> {
  const session = await getAdminSession();
  if (!session) return null;
  if (!allowed.includes(session.role)) return null;
  return session;
}
