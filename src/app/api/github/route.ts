import { NextResponse } from "next/server";
import { siteConfig } from "@/config/meta";
import { getContributions, getProfile } from "@/lib/github-repo";
import { kvGet, kvSet } from "@/lib/kv";

export const dynamic = "force-dynamic";

const KEY = "gh:about";
const FRESH_MS = 30 * 60 * 1000; // refetch from GitHub at most every 30 minutes
const KEEP_SECONDS = 7 * 24 * 60 * 60; // keep the last good copy as a fallback

type Cached = { at: number; profile: unknown; contributions: unknown };

/** Live GitHub numbers for the About page, cached in D1 so GitHub is only asked twice an hour. */
export async function GET() {
  let cached: Cached | null = null;
  try { cached = await kvGet<Cached>(KEY); } catch { /* cache is optional */ }

  if (!cached || Date.now() - cached.at > FRESH_MS) {
    const [profile, contributions] = await Promise.all([getProfile(), getContributions()]);
    if (profile || contributions) {
      cached = { at: Date.now(), profile, contributions };
      try { await kvSet(KEY, cached, KEEP_SECONDS); } catch { /* still serve the fresh data */ }
    }
  }

  return NextResponse.json(
    { username: siteConfig.githubUsername, profile: cached?.profile ?? null, contributions: cached?.contributions ?? null, updatedAt: cached?.at ?? null },
    { headers: { "Cache-Control": "public, max-age=300" } },
  );
}
