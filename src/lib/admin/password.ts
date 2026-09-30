import { createHash, scrypt, timingSafeEqual, type ScryptOptions } from "node:crypto";

/**
 * The password is stored only as a scrypt hash in the ADMIN_PASSWORD_HASH env var,
 * produced by `node scripts/admin-setup.mjs`. Format (no `$`, so .env files don't
 * try to expand it):  scrypt:<log2 N>:<r>:<p>:<salt b64url>:<hash b64url>
 */

function scryptAsync(password: string, salt: Buffer, keylen: number, options: ScryptOptions) {
  return new Promise<Buffer>((resolve, reject) => {
    scrypt(password, salt, keylen, options, (error, key) => (error ? reject(error) : resolve(key)));
  });
}

export async function verifyPassword(password: string, stored: string | undefined): Promise<boolean> {
  const parts = stored?.split(":") ?? [];
  if (parts.length !== 6 || parts[0] !== "scrypt") {
    // Still spend comparable time so a misconfiguration isn't a timing oracle.
    await scryptAsync(password, Buffer.alloc(16), 32, { N: 2 ** 15, r: 8, p: 1 });
    return false;
  }
  const [, logN, r, p, saltB64, hashB64] = parts;
  const expected = Buffer.from(hashB64, "base64url");
  const actual = await scryptAsync(
    password.normalize("NFKC"),
    Buffer.from(saltB64, "base64url"),
    expected.length,
    { N: 2 ** Number(logN), r: Number(r), p: Number(p), maxmem: 256 * 1024 * 1024 },
  );
  return actual.length === expected.length && timingSafeEqual(actual, expected);
}

/** Constant-time string comparison (hashes first so lengths never leak). */
export function safeEqual(a: string, b: string) {
  const ha = createHash("sha256").update(a).digest();
  const hb = createHash("sha256").update(b).digest();
  return timingSafeEqual(ha, hb);
}
