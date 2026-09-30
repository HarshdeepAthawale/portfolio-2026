import { createHash } from "node:crypto";

// Crawlers, link-preview fetchers, uptime checkers and scripts don't count.
export const BOT_UA =
  /bot|crawl|spider|slurp|preview|facebookexternalhit|whatsapp|telegram|discord|slack|headless|lighthouse|pingdom|uptime|curl|wget|python|axios|node-fetch|go-http/i;

// A salted hash of IP + user agent: stable per visitor, never reversible to an
// IP without the salt. Falls back to the Redis token as the salt, so set
// VISITOR_SALT if you ever rotate that token (otherwise visitors re-count once).
export function visitorId(request: Request) {
  const ip =
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    request.headers.get("x-real-ip") ||
    "unknown";
  const userAgent = request.headers.get("user-agent") ?? "";
  const salt =
    process.env.VISITOR_SALT ??
    process.env.KV_REST_API_TOKEN ??
    process.env.UPSTASH_REDIS_REST_TOKEN ??
    "local-dev";
  return createHash("sha256").update(`${salt}|${ip}|${userAgent}`).digest("hex");
}
