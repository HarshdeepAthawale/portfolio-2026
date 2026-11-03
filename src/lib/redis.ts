import { d1Pipeline, type D1 } from "@/lib/d1-redis";

// Storage for sessions, drafts, visitor counts and analytics. On Cloudflare it is
// the D1 database bound as `DB`; elsewhere it falls back to Upstash Redis over REST
// (either the Upstash-direct or the Vercel Marketplace / KV variable names).

/** The Worker's D1 binding, when running on Cloudflare. */
function d1(): D1 | null {
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { getCloudflareContext } = require("@opennextjs/cloudflare") as typeof import("@opennextjs/cloudflare");
    return ((getCloudflareContext().env as { DB?: D1 }).DB) ?? null;
  } catch {
    return null; // Node (next dev / build): no Cloudflare context.
  }
}

function redisUrl() {
  return process.env.UPSTASH_REDIS_REST_URL ?? process.env.KV_REST_API_URL;
}

function redisToken() {
  return process.env.UPSTASH_REDIS_REST_TOKEN ?? process.env.KV_REST_API_TOKEN;
}

export function hasRedisConfig() {
  return Boolean(d1() || (redisUrl() && redisToken()));
}

/** Runs commands in order: on D1 when bound, otherwise in one round trip via Upstash's REST pipeline. */
export async function redisPipeline(commands: (string | number)[][]): Promise<unknown[]> {
  const db = d1();
  if (db) return d1Pipeline(db, commands);
  const res = await fetch(`${redisUrl()}/pipeline`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${redisToken()}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(commands.map((command) => command.map(String))),
    cache: "no-store",
  });

  if (!res.ok) {
    throw new Error(`Redis pipeline failed (${res.status})`);
  }

  const data = (await res.json()) as { result?: unknown; error?: string }[];
  const failed = data.find((entry) => entry.error);
  if (failed) throw new Error(`Redis command failed: ${failed.error}`);
  return data.map((entry) => entry.result);
}
