import { createHmac } from "node:crypto";
import { kvGet, kvSet } from "@/lib/admin/kv";

// RFC 6238 TOTP (SHA-1, 6 digits, 30 s) - what authenticator apps use.
const STEP_SECONDS = 30;
const LAST_STEP_KEY = "admin:totp:last-step";

function base32Decode(input: string) {
  const alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";
  const clean = input.toUpperCase().replace(/[\s=-]/g, "");
  let bits = 0;
  let value = 0;
  const out: number[] = [];
  for (const char of clean) {
    const index = alphabet.indexOf(char);
    if (index === -1) throw new Error("Invalid base32 secret");
    value = (value << 5) | index;
    bits += 5;
    if (bits >= 8) {
      out.push((value >>> (bits - 8)) & 0xff);
      bits -= 8;
    }
  }
  return Buffer.from(out);
}

function hotp(key: Buffer, counter: number) {
  const message = Buffer.alloc(8);
  message.writeBigUInt64BE(BigInt(counter));
  const digest = createHmac("sha1", key).update(message).digest();
  const offset = digest[digest.length - 1] & 0x0f;
  const code = (digest.readUInt32BE(offset) & 0x7fffffff) % 1_000_000;
  return code.toString().padStart(6, "0");
}

/**
 * Checks a code against the current step ±1 (clock drift). Each code works once:
 * steps at or before the last accepted one are rejected, so a code can't be replayed.
 */
export async function verifyTotp(secret: string, code: string): Promise<boolean> {
  if (!/^\d{6}$/.test(code)) return false;
  const key = base32Decode(secret);
  const now = Math.floor(Date.now() / 1000 / STEP_SECONDS);
  const lastStep = (await kvGet<number>(LAST_STEP_KEY)) ?? 0;

  for (const step of [now - 1, now, now + 1]) {
    if (step > lastStep && hotp(key, step) === code) {
      await kvSet(LAST_STEP_KEY, step, STEP_SECONDS * 4);
      return true;
    }
  }
  return false;
}
