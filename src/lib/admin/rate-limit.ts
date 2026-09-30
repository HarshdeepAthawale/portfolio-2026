import { createHash } from "node:crypto";
import { headers } from "next/headers";
import { kvDel, kvGet, kvIncr, kvTtl } from "@/lib/admin/kv";

// Login throttling: per IP, plus a global cap on failures (there's one account,
// so the global cap is the per-account limit). Windows expire on their own.
const WINDOW_SECONDS = 15 * 60;
const MAX_PER_IP = 5;
const MAX_FAILURES_GLOBAL = 20;
const GLOBAL_KEY = "admin:rl:global-failures";

export async function clientIp() {
  const h = await headers();
  return h.get("x-real-ip") ?? h.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";
}

const ipKey = (ip: string) =>
  `admin:rl:ip:${createHash("sha256").update(ip).digest("hex").slice(0, 32)}`;

/** Counts an attempt. Returns how many seconds to wait if the caller is over a limit. */
export async function registerLoginAttempt(ip: string): Promise<number> {
  const globalFailures = (await kvGet<number>(GLOBAL_KEY)) ?? 0;
  if (globalFailures >= MAX_FAILURES_GLOBAL) return (await kvTtl(GLOBAL_KEY)) || WINDOW_SECONDS;

  const attempts = await kvIncr(ipKey(ip), WINDOW_SECONDS);
  if (attempts > MAX_PER_IP) return (await kvTtl(ipKey(ip))) || WINDOW_SECONDS;
  return 0;
}

export async function registerLoginFailure() {
  await kvIncr(GLOBAL_KEY, WINDOW_SECONDS);
}

export async function clearLoginAttempts(ip: string) {
  await kvDel(ipKey(ip));
}
