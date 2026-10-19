import "server-only";
import { randomBytes, scrypt as scryptCallback, timingSafeEqual, type ScryptOptions } from "node:crypto";

// util.promisify loses the options overload, so wrap by hand.
const scrypt = (password: string, salt: Buffer, keyLength: number, options: ScryptOptions) =>
  new Promise<Buffer>((resolve, reject) =>
    scryptCallback(password, salt, keyLength, options, (err, key) => (err ? reject(err) : resolve(key))),
  );

// Node's defaults. They are written into every hash, so they can be raised
// later without invalidating the passwords already stored.
const PARAMS = { N: 16384, r: 8, p: 1 };
const KEY_LENGTH = 64;

export const PASSWORD_MIN_LENGTH = 8;

/** `scrypt$N$r$p$salt$hash`, all base64. */
export async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(16);
  const key = await scrypt(password.normalize("NFKC"), salt, KEY_LENGTH, PARAMS);
  return ["scrypt", PARAMS.N, PARAMS.r, PARAMS.p, salt.toString("base64"), key.toString("base64")].join("$");
}

export async function verifyPassword(password: string, stored: string): Promise<boolean> {
  const [algorithm, N, r, p, salt, hash] = stored.split("$");
  if (algorithm !== "scrypt" || !salt || !hash) return false;
  const expected = Buffer.from(hash, "base64");
  const key = await scrypt(password.normalize("NFKC"), Buffer.from(salt, "base64"), expected.length, {
    N: Number(N),
    r: Number(r),
    p: Number(p),
  });
  return key.length === expected.length && timingSafeEqual(key, expected);
}
