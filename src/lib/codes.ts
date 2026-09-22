import { randomInt, randomBytes, createCipheriv, createDecipheriv } from "crypto";
import bcrypt from "bcryptjs";

const ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // no 0/O/1/I - avoids confusion when typed by hand

function randomSegment(length: number) {
  let out = "";
  for (let i = 0; i < length; i++) {
    out += ALPHABET[randomInt(0, ALPHABET.length)];
  }
  return out;
}

/** Generates a candidate-facing access code like VSOFT-7XQ9-K2M4. */
export function generateAccessCode(): string {
  return `VSOFT-${randomSegment(4)}-${randomSegment(4)}`;
}

export async function hashAccessCode(code: string): Promise<string> {
  return bcrypt.hash(code.trim().toUpperCase(), 10);
}

export async function verifyAccessCode(code: string, hash: string): Promise<boolean> {
  return bcrypt.compare(code.trim().toUpperCase(), hash);
}

export function accessCodeLast4(code: string): string {
  return code.trim().toUpperCase().slice(-4);
}

function getAccessCodeEncryptionKey(): Buffer {
  const hex = process.env.ACCESS_CODE_ENCRYPTION_KEY;
  if (!hex || hex.length !== 64) {
    throw new Error(
      "ACCESS_CODE_ENCRYPTION_KEY must be a 32-byte hex string (64 hex chars) - generate with `openssl rand -hex 32`."
    );
  }
  return Buffer.from(hex, "hex");
}

/**
 * Encrypts a code so admins can look it up later (AES-256-GCM). This is
 * separate from hashAccessCode: the hash is what login checks and can
 * never be reversed, this is purely for the admin-panel "view code"
 * lookup and is decrypted only on the server, for authenticated admins.
 */
export function encryptAccessCode(code: string): string {
  const key = getAccessCodeEncryptionKey();
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", key, iv);
  const ciphertext = Buffer.concat([cipher.update(code.trim().toUpperCase(), "utf8"), cipher.final()]);
  const authTag = cipher.getAuthTag();
  return [iv, authTag, ciphertext].map((b) => b.toString("base64")).join(":");
}

export function decryptAccessCode(encrypted: string): string {
  const key = getAccessCodeEncryptionKey();
  const [ivB64, authTagB64, ciphertextB64] = encrypted.split(":");
  const iv = Buffer.from(ivB64, "base64");
  const authTag = Buffer.from(authTagB64, "base64");
  const ciphertext = Buffer.from(ciphertextB64, "base64");
  const decipher = createDecipheriv("aes-256-gcm", key, iv);
  decipher.setAuthTag(authTag);
  const plain = Buffer.concat([decipher.update(ciphertext), decipher.final()]);
  return plain.toString("utf8");
}

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 10);
}

export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}
