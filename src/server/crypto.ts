import "server-only";
import { createCipheriv, createDecipheriv, randomBytes } from "node:crypto";

// Field-level encryption for high-risk values (passport numbers). AES-256-GCM
// with a random IV per value; the stored form is `v1:<iv>:<tag>:<ciphertext>`
// in base64. The key is APP_ENCRYPTION_KEY (32 random bytes, base64). On AWS
// it comes from Secrets Manager; a KMS data key can replace it later without
// changing the stored format's version prefix handling here.

const VERSION = "v1";

function key(): Buffer {
  const raw = process.env.APP_ENCRYPTION_KEY;
  if (!raw) throw new Error("APP_ENCRYPTION_KEY is not set. See .env.example.");
  const k = Buffer.from(raw, "base64");
  if (k.length !== 32) throw new Error("APP_ENCRYPTION_KEY must be 32 bytes in base64.");
  return k;
}

export const encryptionConfigured = () => !!process.env.APP_ENCRYPTION_KEY;

export function encryptString(plain: string): string {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", key(), iv);
  const ciphertext = Buffer.concat([cipher.update(plain, "utf8"), cipher.final()]);
  return [VERSION, iv.toString("base64"), cipher.getAuthTag().toString("base64"), ciphertext.toString("base64")].join(":");
}

export function decryptString(stored: string): string {
  const [version, iv, tag, ciphertext] = stored.split(":");
  if (version !== VERSION || !iv || !tag || !ciphertext) throw new Error("Unrecognized encrypted value.");
  const decipher = createDecipheriv("aes-256-gcm", key(), Buffer.from(iv, "base64"));
  decipher.setAuthTag(Buffer.from(tag, "base64"));
  return Buffer.concat([decipher.update(Buffer.from(ciphertext, "base64")), decipher.final()]).toString("utf8");
}

/** "****1234" for display in lists and forms. */
export function maskTail(value: string, visible = 4): string {
  if (value.length <= visible) return "*".repeat(value.length);
  return "*".repeat(Math.min(8, value.length - visible)) + value.slice(-visible);
}
