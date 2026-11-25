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

// The passwords people actually choose first. Not a full dictionary: the
// letter-and-digit rule below already refuses most of the well-known lists.
const COMMON = new Set([
  "password1", "password12", "password123", "passw0rd", "p@ssw0rd", "pass1234", "qwerty123", "qwerty12", "1q2w3e4r",
  "1qaz2wsx", "abc12345", "abcd1234", "a1234567", "a12345678", "12345678a", "123456789a", "1234qwer", "q1w2e3r4",
  "admin123", "admin1234", "welcome1", "welcome123", "iloveyou1", "letmein1", "letmein123", "test1234", "bhalojob1",
  "bhalojob123", "japan123", "japan2026", "tokyo123", "bangladesh1", "bangladesh123", "dhaka123", "dhaka1234",
]);

/**
 * Why a new password is not acceptable, or null when it is fine.
 * `related` are things an attacker would try first: the login ID, the name.
 */
export function passwordProblem(password: string, related: (string | undefined)[] = []): string | null {
  const pw = password.normalize("NFKC");
  if (pw.length < PASSWORD_MIN_LENGTH) return `パスワードは${PASSWORD_MIN_LENGTH}文字以上にしてください`;
  if (!/\p{L}/u.test(pw) || !/\p{N}/u.test(pw)) return "パスワードには文字と数字の両方を含めてください";
  // "aaaaaaa1", "11111111a": long enough on paper, guessed in seconds.
  if (new Set(pw).size < 5) return "同じ文字の繰り返しが多いパスワードは使用できません";

  const lower = pw.toLowerCase();
  if (COMMON.has(lower)) return "よく使われるパスワードは使用できません。別のパスワードにしてください";
  for (const value of related) {
    const v = value?.normalize("NFKC").toLowerCase().trim();
    if (!v) continue;
    // The whole login ID or name, or the part of the email before the @.
    const local = v.includes("@") ? v.slice(0, v.indexOf("@")) : v;
    if (lower === v || (local.length >= 4 && lower.includes(local))) {
      return "ログインIDや氏名を含むパスワードは使用できません";
    }
  }
  return null;
}

/** `scrypt$N$r$p$salt$hash`, all base64. */
export async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(16);
  const key = await scrypt(password.normalize("NFKC"), salt, KEY_LENGTH, PARAMS);
  return ["scrypt", PARAMS.N, PARAMS.r, PARAMS.p, salt.toString("base64"), key.toString("base64")].join("$");
}

// A real hash of a random value. Checking against it costs the same as a
// real check, so "no such login ID" cannot be told apart from "wrong
// password" by how long the answer takes.
let decoy: Promise<string> | undefined;

/** Spends the time of a password check and always fails. For login IDs that do not exist. */
export async function verifyAgainstNothing(password: string): Promise<false> {
  decoy ??= hashPassword(randomBytes(24).toString("base64"));
  await verifyPassword(password, await decoy);
  return false;
}

export async function verifyPassword(password: string, stored: string): Promise<boolean> {
  const [algorithm, N, r, p, salt, hash] = stored.split("$");
  if (algorithm !== "scrypt" || !salt || !hash) return false;
  // Refuse cost settings no hash of ours was ever written with (a corrupt row
  // must not make the server allocate gigabytes).
  if (!(Number(N) >= 16384 && Number(N) <= 1048576 && Number(r) === 8 && Number(p) >= 1 && Number(p) <= 4)) return false;
  const expected = Buffer.from(hash, "base64");
  const key = await scrypt(password.normalize("NFKC"), Buffer.from(salt, "base64"), expected.length, {
    N: Number(N),
    r: Number(r),
    p: Number(p),
  });
  return key.length === expected.length && timingSafeEqual(key, expected);
}
