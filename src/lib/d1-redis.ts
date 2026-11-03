import { HLL_REGISTERS, hllAdd, hllCount, hllMerge } from "@/lib/hll";

// The handful of Redis commands this site uses, implemented on Cloudflare D1
// (SQLite). Strings and counters live in `kv`, sorted sets in `zset`, and
// HyperLogLogs as raw registers in `hll`. Each row carries its key's expiry.

type Statement = { bind(...values: unknown[]): Statement; first<T = Record<string, unknown>>(): Promise<T | null>; all<T = Record<string, unknown>>(): Promise<{ results: T[] }>; run(): Promise<{ meta: { changes: number } }> };
export type D1 = { prepare(sql: string): Statement; batch(statements: Statement[]): Promise<unknown[]> };

const TABLES = ["kv", "zset", "hll"] as const;
const alive = "(exp IS NULL OR exp > ?)";

function score(value: string | number) {
  if (value === "+inf") return Infinity;
  if (value === "-inf") return -Infinity;
  return Number(value);
}

async function readRegisters(db: D1, key: string, now: number) {
  const row = await db.prepare(`SELECT regs FROM hll WHERE key = ? AND ${alive}`).bind(key, now).first<{ regs: ArrayBuffer | number[] }>();
  if (!row) return null;
  const bytes = row.regs instanceof ArrayBuffer ? new Uint8Array(row.regs) : Uint8Array.from(row.regs);
  return bytes.length === HLL_REGISTERS ? bytes : null;
}

async function run(db: D1, [name, ...args]: string[], now: number): Promise<unknown> {
  switch (name.toUpperCase()) {
    case "GET": {
      const row = await db.prepare(`SELECT value FROM kv WHERE key = ? AND ${alive}`).bind(args[0], now).first<{ value: string }>();
      return row?.value ?? null;
    }
    case "MGET":
      return Promise.all(args.map((key) => run(db, ["GET", key], now)));
    case "SET": {
      const [key, value, ...options] = args;
      const upper = options.map((o) => o.toUpperCase());
      const ex = upper.indexOf("EX");
      const exp = ex >= 0 ? now + Number(options[ex + 1]) * 1000 : null;
      if (upper.includes("NX") && (await run(db, ["GET", key], now)) !== null) return null;
      await db.prepare("INSERT INTO kv (key, value, exp) VALUES (?, ?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value, exp = excluded.exp").bind(key, value, exp).run();
      return "OK";
    }
    case "INCR": {
      const row = await db
        .prepare(`INSERT INTO kv (key, value, exp) VALUES (?1, '1', NULL)
          ON CONFLICT(key) DO UPDATE SET
            value = CASE WHEN kv.exp IS NULL OR kv.exp > ?2 THEN CAST(CAST(kv.value AS INTEGER) + 1 AS TEXT) ELSE '1' END,
            exp = CASE WHEN kv.exp IS NULL OR kv.exp > ?2 THEN kv.exp ELSE NULL END
          RETURNING value`)
        .bind(args[0], now)
        .first<{ value: string }>();
      return Number(row?.value ?? 1);
    }
    case "DEL": {
      let removed = 0;
      for (const key of args) {
        const results = await db.batch(TABLES.map((table) => db.prepare(`DELETE FROM ${table} WHERE key = ?`).bind(key)));
        if ((results as { meta: { changes: number } }[]).some((r) => r.meta.changes > 0)) removed++;
      }
      return removed;
    }
    case "EXPIRE": {
      const exp = now + Number(args[1]) * 1000;
      const results = await db.batch(TABLES.map((table) => db.prepare(`UPDATE ${table} SET exp = ? WHERE key = ? AND ${alive}`).bind(exp, args[0], now)));
      return (results as { meta: { changes: number } }[]).some((r) => r.meta.changes > 0) ? 1 : 0;
    }
    case "TTL": {
      for (const table of TABLES) {
        const row = await db.prepare(`SELECT exp FROM ${table} WHERE key = ? AND ${alive} LIMIT 1`).bind(args[0], now).first<{ exp: number | null }>();
        if (row) return row.exp === null ? -1 : Math.ceil((row.exp - now) / 1000);
      }
      return -2;
    }
    case "SCAN": {
      // Only `SCAN 0 MATCH prefix* COUNT n` is used; return everything in one page.
      const match = args[args.findIndex((a) => a.toUpperCase() === "MATCH") + 1] ?? "*";
      const like = match.replace(/[%_\\]/g, "\\$&").replace(/\*/g, "%");
      const { results } = await db
        .prepare(`SELECT key FROM kv WHERE key LIKE ?1 ESCAPE '\\' AND ${alive.replace("?", "?2")}
          UNION SELECT DISTINCT key FROM zset WHERE key LIKE ?1 ESCAPE '\\' AND ${alive.replace("?", "?2")}
          UNION SELECT key FROM hll WHERE key LIKE ?1 ESCAPE '\\' AND ${alive.replace("?", "?2")}`)
        .bind(like, now)
        .all<{ key: string }>();
      return ["0", results.map((r) => r.key)];
    }
    case "PFADD": {
      const [key, ...members] = args;
      const existing = await readRegisters(db, key, now);
      const registers = existing ?? new Uint8Array(HLL_REGISTERS);
      const changed = hllAdd(registers, members);
      if (changed || !existing) {
        await db
          .prepare(`INSERT INTO hll (key, regs, exp) VALUES (?, ?, NULL) ON CONFLICT(key) DO UPDATE SET regs = excluded.regs, exp = CASE WHEN hll.exp IS NULL OR hll.exp > ? THEN hll.exp ELSE NULL END`)
          .bind(key, registers, now)
          .run();
      }
      return changed ? 1 : 0;
    }
    case "PFCOUNT": {
      const merged = new Uint8Array(HLL_REGISTERS);
      for (const key of args) {
        const registers = await readRegisters(db, key, now);
        if (registers) hllMerge(merged, registers);
      }
      return hllCount(merged);
    }
    case "ZADD": {
      const [key, value, member] = args;
      await db.prepare("INSERT INTO zset (key, member, score, exp) VALUES (?, ?, ?, NULL) ON CONFLICT(key, member) DO UPDATE SET score = excluded.score").bind(key, member, score(value)).run();
      return 1;
    }
    case "ZINCRBY": {
      const [key, increment, member] = args;
      const row = await db
        .prepare(`INSERT INTO zset (key, member, score, exp) VALUES (?1, ?2, ?3, NULL)
          ON CONFLICT(key, member) DO UPDATE SET score = CASE WHEN zset.exp IS NULL OR zset.exp > ?4 THEN zset.score + ?3 ELSE ?3 END
          RETURNING score`)
        .bind(key, member, Number(increment), now)
        .first<{ score: number }>();
      return String(row?.score ?? increment);
    }
    case "ZREMRANGEBYSCORE": {
      const [key, min, max] = args;
      const result = await db.prepare("DELETE FROM zset WHERE key = ? AND score >= ? AND score <= ?").bind(key, score(min), score(max)).run();
      return result.meta.changes;
    }
    case "ZCOUNT": {
      const [key, min, max] = args;
      const row = await db.prepare(`SELECT COUNT(*) AS n FROM zset WHERE key = ? AND score >= ? AND score <= ? AND ${alive}`).bind(key, score(min), score(max), now).first<{ n: number }>();
      return row?.n ?? 0;
    }
    case "ZUNIONSTORE": {
      const [destination, count, ...keys] = args;
      const sources = keys.slice(0, Number(count));
      await db.prepare("DELETE FROM zset WHERE key = ?").bind(destination).run();
      if (!sources.length) return 0;
      const result = await db
        .prepare(`INSERT INTO zset (key, member, score, exp)
          SELECT ?, member, SUM(score), NULL FROM zset WHERE key IN (${sources.map(() => "?").join(", ")}) AND ${alive} GROUP BY member`)
        .bind(destination, ...sources, now)
        .run();
      return result.meta.changes;
    }
    case "ZREVRANGE": {
      const [key, start, stop] = args;
      const limit = Number(stop) < 0 ? -1 : Number(stop) - Number(start) + 1;
      const { results } = await db
        .prepare(`SELECT member, score FROM zset WHERE key = ? AND ${alive} ORDER BY score DESC, member DESC LIMIT ? OFFSET ?`)
        .bind(key, now, limit, Number(start))
        .all<{ member: string; score: number }>();
      return results.flatMap((r) => [r.member, String(r.score)]);
    }
    default:
      throw new Error(`Unsupported command: ${name}`);
  }
}

/** Runs commands in order and returns their results, like a Redis pipeline. */
export async function d1Pipeline(db: D1, commands: (string | number)[][]) {
  const now = Date.now();
  const results: unknown[] = [];
  for (const command of commands) results.push(await run(db, command.map(String), now));
  // Occasionally sweep expired rows so the tables don't grow forever.
  if (Math.random() < 0.02) {
    await db.batch(TABLES.map((table) => db.prepare(`DELETE FROM ${table} WHERE exp IS NOT NULL AND exp <= ?`).bind(now)));
  }
  return results;
}
