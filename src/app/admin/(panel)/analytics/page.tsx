import { ArrowDownRight, ArrowUpRight } from "@phosphor-icons/react/dist/ssr";
import type { Metadata } from "next";
import Link from "next/link";
import { AutoRefresh } from "@/app/admin/_components/auto-refresh";
import { cardClass } from "@/app/admin/_components/styles";
import { TrafficChart } from "@/app/admin/_components/traffic-chart";
import { getAnalytics, type Breakdown } from "@/lib/analytics";
import { getVisitorCount } from "@/lib/visitor-store";
import { cn } from "@/lib/utils";

export const metadata: Metadata = { title: "Analytics" };

const RANGES = [7, 30, 90] as const;
const format = new Intl.NumberFormat("en-US");
const compact = new Intl.NumberFormat("en-US", { notation: "compact", maximumFractionDigits: 1 });
const regions = new Intl.DisplayNames(["en"], { type: "region" });

function flag(code: string) {
  return /^[A-Z]{2}$/.test(code)
    ? String.fromCodePoint(...[...code].map((c) => 0x1f1a5 + c.charCodeAt(0)))
    : "🌐";
}

function countryName(code: string) {
  try {
    return /^[A-Z]{2}$/.test(code) ? (regions.of(code) ?? code) : "Unknown";
  } catch {
    return code;
  }
}

/** Signed change vs the previous period; null when there's nothing to compare. */
function change(current: number, previous: number) {
  if (previous === 0) return null;
  return Math.round(((current - previous) / previous) * 100);
}

function StatTile({
  label,
  value,
  delta,
  range,
  hint,
}: {
  label: string;
  value: string;
  delta?: number | null;
  range?: number;
  hint?: string;
}) {
  return (
    <div className={cardClass}>
      <p className="text-xs text-secondary">{label}</p>
      <p className="mt-1 text-3xl font-semibold tracking-tight">{value}</p>
      {delta !== undefined && (
        <p className="mt-1 flex items-center gap-1 text-xs text-secondary">
          {delta === null ? (
            "No earlier data"
          ) : (
            <>
              <span
                className={cn(
                  "inline-flex items-center gap-0.5 font-medium",
                  delta >= 0 ? "text-sun" : "text-red-600 dark:text-red-400",
                )}
              >
                {delta >= 0 ? <ArrowUpRight className="size-3" /> : <ArrowDownRight className="size-3" />}
                {Math.abs(delta)}%
              </span>
              vs previous {range} days
            </>
          )}
        </p>
      )}
      {hint && <p className="mt-1 text-xs text-secondary">{hint}</p>}
    </div>
  );
}

/** A ranked list: label and value on one line, a thin bar below scaled to the leader. */
function BarList({
  title,
  items,
  label = (key) => key,
  unit,
}: {
  title: string;
  items: Breakdown;
  label?: (key: string) => React.ReactNode;
  unit: string;
}) {
  const max = items[0]?.value ?? 0;
  const total = items.reduce((sum, item) => sum + item.value, 0);
  return (
    <section className={cardClass}>
      <div className="flex items-baseline justify-between">
        <h2 className="font-display text-lg font-medium tracking-tight">{title}</h2>
        <span className="text-xs text-secondary">{unit}</span>
      </div>
      {items.length === 0 ? (
        <p className="mt-3 text-sm text-secondary">No data yet.</p>
      ) : (
        <ol className="mt-3 space-y-2.5">
          {items.map((item) => (
            <li key={item.key} title={`${format.format(item.value)} ${unit} · ${Math.round((item.value / total) * 100)}%`}>
              <div className="flex items-baseline justify-between gap-3 text-sm">
                <span className="min-w-0 truncate">{label(item.key)}</span>
                <span className="shrink-0 tabular-nums text-secondary">{format.format(item.value)}</span>
              </div>
              <div className="mt-1 h-1.5 rounded-full bg-muted">
                <div
                  className="h-full rounded-full"
                  style={{ width: `${Math.max(2, (item.value / max) * 100)}%`, background: "var(--chart-visitors)" }}
                />
              </div>
            </li>
          ))}
        </ol>
      )}
    </section>
  );
}

export default async function AnalyticsPage({
  searchParams,
}: {
  searchParams: Promise<{ range?: string }>;
}) {
  const { range: rangeParam } = await searchParams;
  const range = RANGES.find((r) => String(r) === rangeParam) ?? 30;
  const [report, allTime] = await Promise.all([getAnalytics(range), getVisitorCount().catch(() => null)]);
  const perVisitor = report.visitors ? (report.pageviews / report.visitors).toFixed(1) : "0";
  const hasData = report.days.some((day) => day.pageviews > 0);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="font-mono text-xs uppercase tracking-[0.15em] text-secondary">Analytics</p>
          <h1 className="font-display mt-1 text-3xl font-medium tracking-tight">Visitors</h1>
          <p className="mt-2 inline-flex items-center gap-2 text-sm text-secondary">
            <span className="relative flex size-2" aria-hidden>
              {report.liveNow > 0 && (
                <span className="absolute inline-flex size-full animate-ping rounded-full bg-sun opacity-60 motion-reduce:animate-none" />
              )}
              <span className={cn("relative inline-flex size-2 rounded-full", report.liveNow > 0 ? "bg-sun" : "bg-foreground/25")} />
            </span>
            {report.liveNow} {report.liveNow === 1 ? "person" : "people"} on the site now
            <span aria-hidden>·</span>
            <AutoRefresh />
          </p>
        </div>
        {/* Filters sit in one row above everything they control. */}
        <nav aria-label="Date range" className="flex rounded-sm border border-border p-0.5 text-sm">
          {RANGES.map((r) => (
            <Link
              key={r}
              href={`/admin/analytics?range=${r}`}
              aria-current={r === range ? "page" : undefined}
              className={cn(
                "rounded-sm px-3 py-1",
                r === range ? "bg-foreground text-background" : "text-secondary hover:text-foreground",
              )}
            >
              {r} days
            </Link>
          ))}
        </nav>
      </div>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatTile
          label="Unique visitors"
          value={compact.format(report.visitors)}
          delta={change(report.visitors, report.previous.visitors)}
          range={range}
        />
        <StatTile
          label="Pageviews"
          value={compact.format(report.pageviews)}
          delta={change(report.pageviews, report.previous.pageviews)}
          range={range}
        />
        <StatTile label="Pages per visitor" value={perVisitor} hint={`Last ${range} days`} />
        <StatTile label="All-time visitors" value={allTime === null ? "-" : compact.format(allTime)} hint="Since the counter started" />
      </div>

      <section className={cardClass}>
        <div className="mb-2 flex items-baseline justify-between gap-3">
          <h2 className="font-display text-lg font-medium tracking-tight">Traffic</h2>
          <span className="text-xs text-secondary">Last {range} days · IST</span>
        </div>
        {hasData ? (
          <TrafficChart days={report.days} />
        ) : (
          <p className="py-16 text-center text-sm text-secondary">
            No visits recorded in this range yet. Real visits appear here as they happen.
          </p>
        )}
        <details className="mt-4 text-sm">
          <summary className="cursor-pointer text-xs text-secondary hover:text-foreground">Show as table</summary>
          <div className="mt-3 max-h-72 overflow-auto rounded-lg border border-border">
            <table className="w-full text-left text-xs">
              <thead className="sticky top-0 bg-card text-secondary">
                <tr>
                  <th className="px-3 py-2 font-medium">Day</th>
                  <th className="px-3 py-2 text-right font-medium">Visitors</th>
                  <th className="px-3 py-2 text-right font-medium">Pageviews</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border tabular-nums">
                {[...report.days].reverse().map((day) => (
                  <tr key={day.day}>
                    <td className="px-3 py-1.5">{day.day}</td>
                    <td className="px-3 py-1.5 text-right">{format.format(day.visitors)}</td>
                    <td className="px-3 py-1.5 text-right">{format.format(day.pageviews)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </details>
      </section>

      <div className="grid gap-6 lg:grid-cols-2">
        <BarList
          title="Top pages"
          unit="views"
          items={report.breakdowns.pages}
          label={(key) => <span className="font-mono text-xs">{key}</span>}
        />
        <BarList title="Referrers" unit="views" items={report.breakdowns.referrers} />
        <BarList
          title="Countries"
          unit="views"
          items={report.breakdowns.countries}
          label={(key) => (
            <span>
              <span aria-hidden className="mr-1.5">{flag(key)}</span>
              {countryName(key)}
            </span>
          )}
        />
        <div className="grid gap-6">
          <BarList title="Devices" unit="views" items={report.breakdowns.devices} />
          <BarList title="Browsers" unit="views" items={report.breakdowns.browsers} />
        </div>
      </div>

      <p className="text-xs text-secondary">
        Privacy-friendly: no cookies and no IP addresses are stored, only daily totals. Bots and your own
        visits while signed in are not counted.
      </p>
    </div>
  );
}
