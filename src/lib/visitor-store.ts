import fs from "fs/promises";
import path from "path";

// Local-dev fallback only (gitignored). Production uses Redis.
const DATA_PATH = path.join(process.cwd(), "data", "visitors.json");

// A Redis HyperLogLog of hashed visitor ids. It stores no ids at all - only
// enough state to estimate the unique count (~0.8% error).
const REDIS_KEY = "portfolio-unique-visitors";

type VisitorData = {
  ids: string[];
};

// Supports both the Upstash-direct names and the Vercel Marketplace / KV names,
// so it works no matter how the Redis database is provisioned.
function redisUrl() {
  return process.env.UPSTASH_REDIS_REST_URL ?? process.env.KV_REST_API_URL;
}

function redisToken() {
  return process.env.UPSTASH_REDIS_REST_TOKEN ?? process.env.KV_REST_API_TOKEN;
}

function hasRedisConfig() {
  return Boolean(redisUrl() && redisToken());
}

// Runs one or more commands in a single round trip via Upstash's REST pipeline.
async function redisPipeline(commands: string[][]): Promise<unknown[]> {
  const res = await fetch(`${redisUrl()}/pipeline`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${redisToken()}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(commands),
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

async function readFileData(): Promise<VisitorData> {
  try {
    const raw = await fs.readFile(DATA_PATH, "utf8");
    const parsed = JSON.parse(raw) as Partial<VisitorData>;
    return { ids: Array.isArray(parsed.ids) ? parsed.ids : [] };
  } catch {
    return { ids: [] };
  }
}

async function writeFileData(data: VisitorData) {
  await fs.mkdir(path.dirname(DATA_PATH), { recursive: true });
  await fs.writeFile(DATA_PATH, JSON.stringify(data, null, 2));
}

export async function getVisitorCount() {
  if (hasRedisConfig()) {
    const [count] = await redisPipeline([["PFCOUNT", REDIS_KEY]]);
    return Number(count);
  }

  const data = await readFileData();
  return data.ids.length;
}

/** Records a visitor (idempotent per id) and returns the unique count. */
export async function recordVisitor(visitorId: string) {
  if (hasRedisConfig()) {
    const [, count] = await redisPipeline([
      ["PFADD", REDIS_KEY, visitorId],
      ["PFCOUNT", REDIS_KEY],
    ]);
    return Number(count);
  }

  const data = await readFileData();
  if (!data.ids.includes(visitorId)) {
    data.ids.push(visitorId);
    await writeFileData(data);
  }
  return data.ids.length;
}
