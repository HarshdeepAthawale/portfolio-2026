import { randomUUID } from "node:crypto";
import fs from "fs/promises";
import path from "path";
import { hasRedisConfig, redisPipeline } from "@/lib/redis";

/**
 * Privacy-friendly analytics: only aggregate counters per day. No IPs, no
 * cookies, no per-visitor history. A visitor is a salted hash that is only
 * ever added to HyperLogLogs (which can't be read back) and to a 5-minute
 * "live now" window.
 *
 * Per day (IST), with a 400-day TTL:
 *   an:<day>:pv                 pageviews           INCR
 *   an:<day>:uv                 unique visitors     PFADD
 *   an:<day>:<dimension>        breakdowns          ZINCRBY (pages, referrers, countries, devices, browsers)
 */

export const DIMENSIONS = ["pages", "referrers", "countries", "devices", "browsers"] as const;
export type Dimension = (typeof DIMENSIONS)[number];

export type PageviewEvent = {
  visitor: string;
  path: string;
  referrer: string;
  country: string;
  device: string;
  browser: string;
};

export type DayPoint = { day: string; visitors: number; pageviews: number };
export type Breakdown = { key: string; value: number }[];

export type AnalyticsReport = {
  days: DayPoint[];
  visitors: number;
  pageviews: number;
  previous: { visitors: number; pageviews: number };
  breakdowns: Record<Dimension, Breakdown>;
  liveNow: number;
};

const TTL_SECONDS = 400 * 24 * 60 * 60;
const LIVE_KEY = "an:live";
const LIVE_WINDOW_MS = 5 * 60 * 1000;
const ALL_TIME_KEY = "portfolio-unique-visitors"; // shared with the landing-page counter

/** Calendar day in India, where the site's owner reads the numbers. */
export function dayKey(date: Date) {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Kolkata" }).format(date);
}

/** The last `count` days, oldest first, ending today (or `count` days before `offset`). */
function dayRange(count: number, offset = 0) {
  const days: string[] = [];
  const now = Date.now();
  for (let i = count - 1 + offset; i >= offset; i--) days.push(dayKey(new Date(now - i * 86_400_000)));
  return days;
}

// ---------------------------------------------------------------- Local fallback

type FileDay = { pv: number; uv: string[] } & Partial<Record<Dimension, Record<string, number>>>;
type FileStore = { days: Record<string, FileDay>; live: Record<string, number>; allTime: string[] };

const FILE = path.join(process.cwd(), "data", "analytics.json");

async function readFile(): Promise<FileStore> {
  try {
    return JSON.parse(await fs.readFile(FILE, "utf8")) as FileStore;
  } catch {
    return { days: {}, live: {}, allTime: [] };
  }
}

async function writeFile(store: FileStore) {
  await fs.mkdir(path.dirname(FILE), { recursive: true });
  await fs.writeFile(FILE, JSON.stringify(store));
}

function fileMode() {
  if (hasRedisConfig()) return false;
  if (process.env.NODE_ENV === "production") throw new Error("Analytics storage is not configured.");
  return true;
}

// ---------------------------------------------------------------- Write

export async function recordPageview(event: PageviewEvent) {
  const day = dayKey(new Date());
  const now = Date.now();
  const values: Record<Dimension, string> = {
    pages: event.path,
    referrers: event.referrer,
    countries: event.country,
    devices: event.device,
    browsers: event.browser,
  };

  if (fileMode()) {
    const store = await readFile();
    const entry = (store.days[day] ??= { pv: 0, uv: [] });
    entry.pv += 1;
    if (!entry.uv.includes(event.visitor)) entry.uv.push(event.visitor);
    for (const dimension of DIMENSIONS) {
      const counts = (entry[dimension] ??= {});
      counts[values[dimension]] = (counts[values[dimension]] ?? 0) + 1;
    }
    store.live[event.visitor] = now;
    if (!store.allTime.includes(event.visitor)) store.allTime.push(event.visitor);
    await writeFile(store);
    return;
  }

  const prefix = `an:${day}`;
  await redisPipeline([
    ["INCR", `${prefix}:pv`],
    ["EXPIRE", `${prefix}:pv`, TTL_SECONDS],
    ["PFADD", `${prefix}:uv`, event.visitor],
    ["EXPIRE", `${prefix}:uv`, TTL_SECONDS],
    ...DIMENSIONS.flatMap((dimension) => [
      ["ZINCRBY", `${prefix}:${dimension}`, 1, values[dimension]],
      ["EXPIRE", `${prefix}:${dimension}`, TTL_SECONDS],
    ]),
    ["ZADD", LIVE_KEY, now, event.visitor],
    ["ZREMRANGEBYSCORE", LIVE_KEY, 0, now - LIVE_WINDOW_MS],
    ["PFADD", ALL_TIME_KEY, event.visitor],
  ]);
}

// ---------------------------------------------------------------- Read

function toBreakdown(counts: Record<string, number>, limit = 10): Breakdown {
  return Object.entries(counts)
    .map(([key, value]) => ({ key, value }))
    .sort((a, b) => b.value - a.value)
    .slice(0, limit);
}

async function fileReport(days: string[], previousDays: string[]): Promise<AnalyticsReport> {
  const store = await readFile();
  const union = (list: string[]) => new Set(list.flatMap((day) => store.days[day]?.uv ?? [])).size;
  const sum = (list: string[]) => list.reduce((total, day) => total + (store.days[day]?.pv ?? 0), 0);

  const breakdowns = Object.fromEntries(
    DIMENSIONS.map((dimension) => {
      const totals: Record<string, number> = {};
      for (const day of days) {
        for (const [key, value] of Object.entries(store.days[day]?.[dimension] ?? {})) {
          totals[key] = (totals[key] ?? 0) + value;
        }
      }
      return [dimension, toBreakdown(totals)];
    }),
  ) as Record<Dimension, Breakdown>;

  const cutoff = Date.now() - LIVE_WINDOW_MS;
  return {
    days: days.map((day) => ({
      day,
      visitors: store.days[day]?.uv.length ?? 0,
      pageviews: store.days[day]?.pv ?? 0,
    })),
    visitors: union(days),
    pageviews: sum(days),
    previous: { visitors: union(previousDays), pageviews: sum(previousDays) },
    breakdowns,
    liveNow: Object.values(store.live).filter((time) => time >= cutoff).length,
  };
}

async function redisReport(days: string[], previousDays: string[]): Promise<AnalyticsReport> {
  const keys = (list: string[], suffix: string) => list.map((day) => `an:${day}:${suffix}`);
  const scratch = `an:tmp:${randomUUID()}`;
  const results = await redisPipeline([
    ["MGET", ...keys(days, "pv")],
    ...days.map((day) => ["PFCOUNT", `an:${day}:uv`]),
    ["PFCOUNT", ...keys(days, "uv")],
    ["MGET", ...keys(previousDays, "pv")],
    ["PFCOUNT", ...keys(previousDays, "uv")],
    // Merge each breakdown across the range into a short-lived key, read the top 10.
    ...DIMENSIONS.flatMap((dimension) => {
      const tmp = `${scratch}:${dimension}`;
      return [
        ["ZUNIONSTORE", tmp, days.length, ...keys(days, dimension)],
        ["ZREVRANGE", tmp, 0, 9, "WITHSCORES"],
        ["DEL", tmp],
      ];
    }),
    ["ZCOUNT", LIVE_KEY, Date.now() - LIVE_WINDOW_MS, "+inf"],
  ]);

  let i = 0;
  const pvs = (results[i++] as (string | null)[]).map((value) => Number(value ?? 0));
  const uvs = days.map(() => Number(results[i++]));
  const visitors = Number(results[i++]);
  const previousPageviews = (results[i++] as (string | null)[]).reduce((t, v) => t + Number(v ?? 0), 0);
  const previousVisitors = Number(results[i++]);
  const breakdowns = Object.fromEntries(
    DIMENSIONS.map((dimension) => {
      i++; // ZUNIONSTORE count
      const flat = results[i++] as string[];
      i++; // DEL
      const totals: Record<string, number> = {};
      for (let j = 0; j < flat.length; j += 2) totals[flat[j]] = Number(flat[j + 1]);
      return [dimension, toBreakdown(totals)];
    }),
  ) as Record<Dimension, Breakdown>;
  const liveNow = Number(results[i++]);

  return {
    days: days.map((day, index) => ({ day, visitors: uvs[index], pageviews: pvs[index] })),
    visitors,
    pageviews: pvs.reduce((total, value) => total + value, 0),
    previous: { visitors: previousVisitors, pageviews: previousPageviews },
    breakdowns,
    liveNow,
  };
}

/** Totals, a daily series and breakdowns for the last `range` days vs the period before. */
export async function getAnalytics(range: number): Promise<AnalyticsReport> {
  const days = dayRange(range);
  const previousDays = dayRange(range, range);
  return fileMode() ? fileReport(days, previousDays) : redisReport(days, previousDays);
}
