import { recordPageview } from "@/lib/analytics";
import { SESSION_COOKIE } from "@/lib/admin/session";
import { kvIncr } from "@/lib/admin/kv";
import { BOT_UA, visitorId } from "@/lib/visitor-id";

export const dynamic = "force-dynamic";

const PRIVATE_PATH = /^\/(admin|preview|api)(\/|$)/;

function deviceOf(ua: string) {
  if (/iPad|Tablet/i.test(ua)) return "Tablet";
  if (/Mobi|Android|iPhone/i.test(ua)) return "Mobile";
  return "Desktop";
}

function browserOf(ua: string) {
  if (/Edg\//.test(ua)) return "Edge";
  if (/OPR\/|Opera/.test(ua)) return "Opera";
  if (/SamsungBrowser/.test(ua)) return "Samsung Internet";
  if (/Firefox|FxiOS/.test(ua)) return "Firefox";
  if (/Chrome|CriOS/.test(ua)) return "Chrome";
  if (/Safari/.test(ua)) return "Safari";
  return "Other";
}

/** "https://www.google.com/search?q=…" -> "google.com"; our own site and blanks -> "Direct". */
function referrerOf(raw: unknown, host: string) {
  if (typeof raw !== "string" || !raw) return "Direct";
  try {
    const name = new URL(raw).hostname.replace(/^www\./, "");
    const self = host.replace(/^www\./, "").split(":")[0];
    return !name || name === self ? "Direct" : name.slice(0, 100);
  } catch {
    return "Direct";
  }
}

/** Records one pageview. Sent with navigator.sendBeacon; always answers 204. */
export async function POST(request: Request) {
  const done = new Response(null, { status: 204 });
  try {
    const ua = request.headers.get("user-agent") ?? "";
    const cookies = request.headers.get("cookie") ?? "";
    // Bots, and you (signed in to /admin), don't count.
    if (!ua || BOT_UA.test(ua) || cookies.includes(`${SESSION_COOKIE}=`)) return done;

    const body = JSON.parse((await request.text()).slice(0, 2000)) as { path?: unknown; referrer?: unknown };
    if (typeof body.path !== "string" || !body.path.startsWith("/")) return done;
    const pagePath = body.path.split(/[?#]/)[0].slice(0, 200) || "/";
    if (PRIVATE_PATH.test(pagePath)) return done;

    const visitor = visitorId(request);
    // A cheap guard against someone looping the endpoint to inflate numbers.
    if ((await kvIncr(`an:rl:${visitor.slice(0, 32)}`, 60)) > 60) return done;

    const country = request.headers.get("x-vercel-ip-country") ?? "";
    await recordPageview({
      visitor,
      path: pagePath,
      referrer: referrerOf(body.referrer, request.headers.get("host") ?? ""),
      country: /^[A-Z]{2}$/.test(country) ? country : "Unknown",
      device: deviceOf(ua),
      browser: browserOf(ua),
    });
  } catch (error) {
    console.error("[analytics] failed to record", error);
  }
  return done;
}
