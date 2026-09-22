// Usage: node scripts/backfill-access-codes.mjs
//
// One-time backfill: every assessment_invites row already has a working
// access_code_hash (NOT NULL since the row was created - login has never
// been broken for anyone). What some older rows lack is
// access_code_encrypted, added mid-session so admins can view the
// original code - it's null for any invite created/sent before that.
//
// This generates a FRESH code for exactly those rows and writes it to
// access_code_hash + access_code_last4 + access_code_encrypted together,
// so all three stay consistent (whatever the admin panel displays is what
// login will actually accept).
//
// Safety: this only touches rows where access_code_encrypted IS NULL. Run
// this first to see what would be affected:
//   node -e "...same connection..." (or just run this script - it prints
//   a per-row safety check and refuses to touch anything already
//   in progress/submitted)
//
// Rows with status other than 'invited' are SKIPPED even if they're
// missing access_code_encrypted, because that would mean the candidate
// already logged in with their original code (which we can never recover)
// and is or was actively using it - overwriting the hash would risk
// locking them out. Verified before writing this script: as of this run,
// 0 such rows exist, but the guard stays as a permanent safety net.
import { config } from "dotenv";
config({ path: ".env.local" });
import { randomInt, randomBytes, createCipheriv } from "crypto";
import bcrypt from "bcryptjs";
import { createClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !serviceKey) {
  console.error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env.local");
  process.exit(1);
}
const supabase = createClient(url, serviceKey);

// Mirrors src/lib/codes.ts exactly (duplicated rather than imported: plain
// .mjs scripts here don't go through a TS loader, and this is a one-time
// production data script where depending on Node's native TS stripping
// felt like an unnecessary risk). Keep these in sync if codes.ts changes.
const ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
function randomSegment(length) {
  let out = "";
  for (let i = 0; i < length; i++) out += ALPHABET[randomInt(0, ALPHABET.length)];
  return out;
}
function generateAccessCode() {
  return `VSOFT-${randomSegment(4)}-${randomSegment(4)}`;
}
function hashAccessCode(code) {
  return bcrypt.hash(code.trim().toUpperCase(), 10);
}
function accessCodeLast4(code) {
  return code.trim().toUpperCase().slice(-4);
}
function getAccessCodeEncryptionKey() {
  const hex = process.env.ACCESS_CODE_ENCRYPTION_KEY;
  if (!hex || hex.length !== 64) {
    throw new Error("ACCESS_CODE_ENCRYPTION_KEY must be a 32-byte hex string (64 hex chars).");
  }
  return Buffer.from(hex, "hex");
}
function encryptAccessCode(code) {
  const key = getAccessCodeEncryptionKey();
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", key, iv);
  const ciphertext = Buffer.concat([cipher.update(code.trim().toUpperCase(), "utf8"), cipher.final()]);
  const authTag = cipher.getAuthTag();
  return [iv, authTag, ciphertext].map((b) => b.toString("base64")).join(":");
}

const { data: invites, error } = await supabase
  .from("assessment_invites")
  .select("id, status, access_code_encrypted")
  .is("access_code_encrypted", null);

if (error) {
  console.error("Failed to query invites:", error.message);
  process.exit(1);
}

const safe = invites.filter((i) => i.status === "invited");
const skipped = invites.filter((i) => i.status !== "invited");

console.log(`Found ${invites.length} invite(s) with no access_code_encrypted.`);
console.log(`  ${safe.length} are status "invited" (never logged in) - safe to backfill.`);
if (skipped.length > 0) {
  console.log(`  ${skipped.length} have a DIFFERENT status - SKIPPING (their real code can't be recovered, and`);
  console.log(`  they may already be relying on it):`);
  for (const s of skipped) console.log(`    - ${s.id} (status: ${s.status})`);
}

let done = 0;
let failed = 0;
for (const invite of safe) {
  const code = generateAccessCode();
  const { error: updateError } = await supabase
    .from("assessment_invites")
    .update({
      access_code_hash: await hashAccessCode(code),
      access_code_last4: accessCodeLast4(code),
      access_code_encrypted: encryptAccessCode(code),
    })
    .eq("id", invite.id);

  if (updateError) {
    failed++;
    console.error(`✗ ${invite.id}:`, updateError.message);
  } else {
    done++;
  }
}

console.log(`\nBackfilled ${done} invite(s). ${failed} failed. ${skipped.length} skipped (see above).`);
if (skipped.length > 0) {
  console.log(
    "For skipped rows, use the candidate's own \"forgot code\" flow (regenerates safely) if they need a new code."
  );
}
