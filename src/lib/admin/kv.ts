import fs from "fs/promises";
import path from "path";
import { hasRedisConfig, redisPipeline } from "@/lib/redis";

/**
 * A tiny key-value store for admin state: sessions, rate limits, drafts.
 * Production uses Redis. Local dev without Redis falls back to a gitignored
 * JSON file; that fallback is refused in production.
 */

const FILE = path.join(process.cwd(), "data", "admin-kv.json");

type FileStore = Record<string, { v: string; exp?: number }>;

function redisEnabled() {
  if (hasRedisConfig()) return true;
  if (process.env.NODE_ENV === "production") {
    throw new Error("Admin storage is not configured (Redis env vars missing).");
  }
  return false;
}

async function readFileStore(): Promise<FileStore> {
  try {
    const store = JSON.parse(await fs.readFile(FILE, "utf8")) as FileStore;
    const now = Date.now();
    for (const [key, entry] of Object.entries(store)) {
      if (entry.exp && entry.exp < now) delete store[key];
    }
    return store;
  } catch {
    return {};
  }
}

async function writeFileStore(store: FileStore) {
  await fs.mkdir(path.dirname(FILE), { recursive: true });
  await fs.writeFile(FILE, JSON.stringify(store, null, 2));
}

export async function kvGet<T>(key: string): Promise<T | null> {
  let raw: string | null;
  if (redisEnabled()) {
    const [value] = await redisPipeline([["GET", key]]);
    raw = (value as string | null) ?? null;
  } else {
    raw = (await readFileStore())[key]?.v ?? null;
  }
  if (raw === null) return null;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

export async function kvSet(key: string, value: unknown, ttlSeconds?: number) {
  const raw = JSON.stringify(value);
  if (redisEnabled()) {
    await redisPipeline([ttlSeconds ? ["SET", key, raw, "EX", ttlSeconds] : ["SET", key, raw]]);
    return;
  }
  const store = await readFileStore();
  store[key] = { v: raw, exp: ttlSeconds ? Date.now() + ttlSeconds * 1000 : undefined };
  await writeFileStore(store);
}

export async function kvDel(...keys: string[]) {
  if (keys.length === 0) return;
  if (redisEnabled()) {
    await redisPipeline([["DEL", ...keys]]);
    return;
  }
  const store = await readFileStore();
  for (const key of keys) delete store[key];
  await writeFileStore(store);
}

/** Increments a counter; the TTL starts with the first increment of a window. */
export async function kvIncr(key: string, ttlSeconds: number): Promise<number> {
  if (redisEnabled()) {
    // Fixed window: create the key with its TTL only if missing, then count.
    const [, count] = await redisPipeline([
      ["SET", key, 0, "EX", ttlSeconds, "NX"],
      ["INCR", key],
    ]);
    return Number(count);
  }
  const store = await readFileStore();
  const entry = store[key];
  const count = (entry ? Number(entry.v) : 0) + 1;
  store[key] = { v: String(count), exp: entry?.exp ?? Date.now() + ttlSeconds * 1000 };
  await writeFileStore(store);
  return count;
}

/** Seconds until a key expires, or 0 if it has no TTL / doesn't exist. */
export async function kvTtl(key: string): Promise<number> {
  if (redisEnabled()) {
    const [ttl] = await redisPipeline([["TTL", key]]);
    return Math.max(0, Number(ttl));
  }
  const exp = (await readFileStore())[key]?.exp;
  return exp ? Math.max(0, Math.ceil((exp - Date.now()) / 1000)) : 0;
}

/** All keys starting with `prefix` (prefix must not contain glob characters). */
export async function kvKeys(prefix: string): Promise<string[]> {
  if (redisEnabled()) {
    const keys: string[] = [];
    let cursor = "0";
    do {
      const [result] = await redisPipeline([["SCAN", cursor, "MATCH", `${prefix}*`, "COUNT", 200]]);
      const [next, batch] = result as [string, string[]];
      cursor = next;
      keys.push(...batch);
    } while (cursor !== "0");
    return keys;
  }
  return Object.keys(await readFileStore()).filter((key) => key.startsWith(prefix));
}
