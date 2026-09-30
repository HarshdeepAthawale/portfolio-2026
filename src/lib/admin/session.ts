import { createHash, randomBytes } from "node:crypto";
import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";
import { kvDel, kvGet, kvIncr, kvSet } from "@/lib/admin/kv";

/**
 * Opaque, server-side sessions. The cookie holds 256 random bits; the store keeps
 * the session under a hash of it, so a leaked store can't be replayed as cookies.
 */

const IDLE_SECONDS = 30 * 60; // the editor's autosave keeps an active session alive
const ABSOLUTE_SECONDS = 8 * 60 * 60;
const TOUCH_EVERY_MS = 60 * 1000;
const EPOCH_KEY = "admin:session-epoch";

export const SESSION_COOKIE =
  process.env.NODE_ENV === "production" ? "__Host-hd_admin" : "hd_admin";

type Session = {
  created: number;
  seen: number;
  /** Hash of the User-Agent it was created with; a mismatch ends the session. */
  ua: string;
  /** Bumped by "sign out everywhere" to invalidate every existing session. */
  epoch: number;
};

const sha256 = (value: string) => createHash("sha256").update(value).digest("hex");
const sessionKey = (token: string) => `admin:session:${sha256(token)}`;

async function currentEpoch() {
  return (await kvGet<number>(EPOCH_KEY)) ?? 0;
}

async function userAgentHash() {
  return sha256((await headers()).get("user-agent") ?? "");
}

export async function createSession() {
  const token = randomBytes(32).toString("base64url");
  const now = Date.now();
  const session: Session = {
    created: now,
    seen: now,
    ua: await userAgentHash(),
    epoch: await currentEpoch(),
  };
  await kvSet(sessionKey(token), session, IDLE_SECONDS);

  (await cookies()).set(SESSION_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict",
    path: "/",
    // No maxAge: a browser-session cookie. The server enforces the real timeouts.
  });
}

/** The current admin session, or null. Enforces idle/absolute timeouts and UA binding. */
export async function getSession(): Promise<Session | null> {
  const token = (await cookies()).get(SESSION_COOKIE)?.value;
  if (!token || token.length > 100) return null;

  const key = sessionKey(token);
  const session = await kvGet<Session>(key);
  if (!session) return null;

  const now = Date.now();
  const expired =
    now - session.created > ABSOLUTE_SECONDS * 1000 || now - session.seen > IDLE_SECONDS * 1000;
  if (
    expired ||
    session.ua !== (await userAgentHash()) ||
    session.epoch !== (await currentEpoch())
  ) {
    await kvDel(key);
    return null;
  }

  if (now - session.seen > TOUCH_EVERY_MS) {
    const remaining = Math.ceil((session.created + ABSOLUTE_SECONDS * 1000 - now) / 1000);
    await kvSet(key, { ...session, seen: now }, Math.max(1, Math.min(IDLE_SECONDS, remaining)));
  }
  return session;
}

/** For pages: sends anyone without a valid session to the login screen. */
export async function requireAdmin() {
  const session = await getSession();
  if (!session) redirect("/admin/login");
  return session;
}

/** For server actions and API routes: throws instead of redirecting. */
export async function assertAdmin() {
  const session = await getSession();
  if (!session) throw new Error("Unauthorized");
  return session;
}

export async function destroySession() {
  const jar = await cookies();
  const token = jar.get(SESSION_COOKIE)?.value;
  if (token) await kvDel(sessionKey(token));
  jar.delete(SESSION_COOKIE);
}

/** Invalidates every session on every device. */
export async function destroyAllSessions() {
  await kvIncr(EPOCH_KEY, 10 * 365 * 24 * 60 * 60);
  await destroySession();
}
