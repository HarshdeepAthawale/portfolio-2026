// Upstash Redis over its REST API. Supports both the Upstash-direct names and
// the Vercel Marketplace / KV names, so it works however the database was provisioned.
function redisUrl() {
  return process.env.UPSTASH_REDIS_REST_URL ?? process.env.KV_REST_API_URL;
}

function redisToken() {
  return process.env.UPSTASH_REDIS_REST_TOKEN ?? process.env.KV_REST_API_TOKEN;
}

export function hasRedisConfig() {
  return Boolean(redisUrl() && redisToken());
}

/** Runs one or more commands in a single round trip via Upstash's REST pipeline. */
export async function redisPipeline(commands: (string | number)[][]): Promise<unknown[]> {
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
