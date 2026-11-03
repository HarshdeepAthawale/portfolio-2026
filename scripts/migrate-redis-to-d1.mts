// One-off copy of the Upstash Redis data into the D1 tables used on Cloudflare.
// Safe to re-run: every row is upserted, sorted sets are replaced whole.
//
//   node --experimental-strip-types scripts/migrate-redis-to-d1.mts <env-file> <out.sql>
//   npx wrangler d1 execute harshdeepathawale-db --remote --file <out.sql>
//
// <env-file> needs KV_REST_API_URL / KV_REST_API_TOKEN (or the UPSTASH_REDIS_REST_* names).
import { readFileSync, writeFileSync } from "node:fs";
import { hllFromRedis } from "../src/lib/hll.ts";

const [envFile, outFile] = process.argv.slice(2);
const env = Object.fromEntries(
  readFileSync(envFile, "utf8")
    .split(/\r?\n/)
    .filter((line) => /^[A-Z_]+=/.test(line))
    .map((line) => [line.slice(0, line.indexOf("=")), line.slice(line.indexOf("=") + 1).replace(/^"|"$/g, "")]),
);
const url = env.UPSTASH_REDIS_REST_URL ?? env.KV_REST_API_URL;
const token = env.UPSTASH_REDIS_REST_TOKEN ?? env.KV_REST_API_TOKEN;

async function pipeline(commands: (string | number)[][], base64 = false) {
  const res = await fetch(`${url}/pipeline`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, ...(base64 ? { "Upstash-Encoding": "base64" } : {}) },
    body: JSON.stringify(commands.map((c) => c.map(String))),
  });
  if (!res.ok) throw new Error(`Redis ${res.status}`);
  return ((await res.json()) as { result: unknown }[]).map((r) => r.result);
}

const quote = (value: string) => `'${value.replace(/'/g, "''")}'`;
const now = Date.now();
const keys: string[] = [];
let cursor = "0";
do {
  const [[next, batch]] = (await pipeline([["SCAN", cursor, "COUNT", 500]])) as [[string, string[]]];
  cursor = next;
  keys.push(...batch);
} while (cursor !== "0");

const sql: string[] = [];
const counts = { kv: 0, zset: 0, hll: 0, skipped: 0 };
for (const key of keys) {
  const [type, pttl] = (await pipeline([["TYPE", key], ["PTTL", key]])) as [string, number];
  if (pttl === -2) continue; // expired meanwhile
  const exp = pttl > 0 ? String(now + pttl) : "NULL";
  if (type === "string") {
    const [raw] = (await pipeline([["GET", key]], true)) as [string];
    const bytes = Buffer.from(raw, "base64");
    if (bytes.subarray(0, 4).toString("latin1") === "HYLL") {
      const registers = hllFromRedis(bytes);
      sql.push(`INSERT OR REPLACE INTO hll (key, regs, exp) VALUES (${quote(key)}, X'${Buffer.from(registers).toString("hex")}', ${exp});`);
      counts.hll++;
    } else {
      sql.push(`INSERT OR REPLACE INTO kv (key, value, exp) VALUES (${quote(key)}, ${quote(bytes.toString("utf8"))}, ${exp});`);
      counts.kv++;
    }
  } else if (type === "zset") {
    const [flat] = (await pipeline([["ZRANGE", key, 0, -1, "WITHSCORES"]])) as [string[]];
    sql.push(`DELETE FROM zset WHERE key = ${quote(key)};`);
    for (let i = 0; i < flat.length; i += 2) {
      sql.push(`INSERT INTO zset (key, member, score, exp) VALUES (${quote(key)}, ${quote(flat[i])}, ${Number(flat[i + 1])}, ${exp});`);
    }
    counts.zset++;
  } else {
    counts.skipped++;
    console.warn(`Skipping ${key} (type ${type})`);
  }
}

writeFileSync(outFile, sql.join("\n") + "\n");
console.log(`${keys.length} keys → ${JSON.stringify(counts)}, ${sql.length} statements written to ${outFile}`);
