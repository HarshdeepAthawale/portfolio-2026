"use client";

import { useLayoutEffect, useRef, useState } from "react";
import type { DayPoint } from "@/lib/analytics";

const HEIGHT = 240;
const PAD = { top: 12, right: 12, bottom: 28, left: 40 };

const SERIES = [
  { key: "visitors", label: "Visitors", color: "var(--chart-visitors)", area: true },
  { key: "pageviews", label: "Pageviews", color: "var(--chart-pageviews)", area: false },
] as const;

/** Rounds up to a clean axis maximum (1, 2, 2.5, 5 × 10^n) split into 4 ticks. */
function niceScale(max: number) {
  if (max <= 0) return { top: 4, step: 1 };
  const rough = max / 4;
  const power = 10 ** Math.floor(Math.log10(rough));
  const step = [1, 2, 2.5, 5, 10].map((m) => m * power).find((s) => s >= rough) ?? 10 * power;
  const niceStep = Math.max(1, step);
  return { top: Math.ceil(max / niceStep) * niceStep, step: niceStep };
}

const format = new Intl.NumberFormat("en-US");

function dayLabel(day: string, long = false) {
  const date = new Date(`${day}T00:00:00`);
  return date.toLocaleDateString("en-US", long ? { weekday: "short", month: "short", day: "numeric" } : { month: "short", day: "numeric" });
}

/** Visitors and pageviews per day on one shared count axis, with a hover crosshair. */
export function TrafficChart({ days }: { days: DayPoint[] }) {
  const box = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(640);
  const [active, setActive] = useState<number | null>(null);

  // Measure before paint so the chart never draws at a guessed width.
  useLayoutEffect(() => {
    const el = box.current;
    if (!el) return;
    setWidth(Math.max(280, el.clientWidth));
    const observer = new ResizeObserver(([entry]) => setWidth(Math.max(280, entry.contentRect.width)));
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  const { top, step } = niceScale(Math.max(...days.map((d) => Math.max(d.visitors, d.pageviews))));
  const innerW = width - PAD.left - PAD.right;
  const innerH = HEIGHT - PAD.top - PAD.bottom;
  const x = (i: number) => PAD.left + (days.length === 1 ? innerW / 2 : (i / (days.length - 1)) * innerW);
  const y = (value: number) => PAD.top + innerH - (value / top) * innerH;

  const paths = SERIES.map((series) => {
    const points = days.map((d, i) => `${x(i).toFixed(1)},${y(d[series.key]).toFixed(1)}`);
    const line = `M${points.join("L")}`;
    const areaPath = `${line}L${x(days.length - 1).toFixed(1)},${y(0)}L${x(0).toFixed(1)},${y(0)}Z`;
    return { ...series, line, areaPath };
  });

  const ticks = Array.from({ length: Math.round(top / step) + 1 }, (_, i) => i * step);
  // A handful of evenly spaced date labels, always including the ends.
  const labelEvery = Math.max(1, Math.ceil(days.length / Math.max(2, Math.floor(innerW / 90))));
  const xLabels = days
    .map((d, i) => ({ i, d }))
    .filter(({ i }) => i % labelEvery === 0 || i === days.length - 1)
    .filter(({ i }, n, all) => i === days.length - 1 || n === all.length - 1 || all[n + 1].i - i >= labelEvery * 0.6);

  function indexAt(clientX: number) {
    const rect = box.current!.getBoundingClientRect();
    const ratio = (clientX - rect.left - PAD.left) / innerW;
    return Math.min(days.length - 1, Math.max(0, Math.round(ratio * (days.length - 1))));
  }

  const point = active !== null ? days[active] : null;
  const tipLeft = active !== null ? Math.min(Math.max(x(active), 80), width - 80) : 0;

  return (
    <div>
      {/* Legend: identity never relies on colour alone. */}
      <div className="mb-3 flex flex-wrap gap-4 text-xs text-secondary">
        {SERIES.map((series) => (
          <span key={series.key} className="inline-flex items-center gap-1.5">
            <span className="h-0.5 w-4 rounded-full" style={{ background: series.color }} />
            {series.label}
          </span>
        ))}
      </div>

      <div
        ref={box}
        className="relative touch-pan-y outline-none"
        onPointerMove={(event) => setActive(indexAt(event.clientX))}
        onPointerLeave={() => setActive(null)}
        onFocus={() => setActive((current) => current ?? days.length - 1)}
        onBlur={() => setActive(null)}
        onKeyDown={(event) => {
          if (event.key === "ArrowLeft") setActive((i) => Math.max(0, (i ?? days.length) - 1));
          if (event.key === "ArrowRight") setActive((i) => Math.min(days.length - 1, (i ?? -1) + 1));
        }}
        tabIndex={0}
        role="img"
        aria-label={`Daily visitors and pageviews over the last ${days.length} days. Use the arrow keys to read each day.`}
      >
        <svg width={width} height={HEIGHT} className="block overflow-visible">
          {ticks.map((tick) => (
            <g key={tick}>
              <line x1={PAD.left} x2={width - PAD.right} y1={y(tick)} y2={y(tick)} stroke="var(--border)" strokeWidth={1} />
              <text x={PAD.left - 8} y={y(tick)} dy="0.32em" textAnchor="end" className="fill-secondary text-[10px] tabular-nums">
                {format.format(tick)}
              </text>
            </g>
          ))}
          {xLabels.map(({ i, d }) => (
            <text
              key={d.day}
              x={x(i)}
              y={HEIGHT - 8}
              textAnchor={i === 0 ? "start" : i === days.length - 1 ? "end" : "middle"}
              className="fill-secondary text-[10px]"
            >
              {dayLabel(d.day)}
            </text>
          ))}

          {paths.map((series) =>
            series.area ? <path key={`${series.key}-area`} d={series.areaPath} fill={series.color} opacity={0.1} /> : null,
          )}
          {paths.map((series) => (
            <path
              key={series.key}
              d={series.line}
              fill="none"
              stroke={series.color}
              strokeWidth={2}
              strokeLinejoin="round"
              strokeLinecap="round"
            />
          ))}

          {active !== null && (
            <g>
              <line x1={x(active)} x2={x(active)} y1={PAD.top} y2={PAD.top + innerH} stroke="var(--foreground)" strokeOpacity={0.25} strokeWidth={1} />
              {SERIES.map((series) => (
                <circle
                  key={series.key}
                  cx={x(active)}
                  cy={y(days[active][series.key])}
                  r={4}
                  fill={series.color}
                  stroke="var(--card)"
                  strokeWidth={2}
                />
              ))}
            </g>
          )}
        </svg>

        {point && (
          <div
            className="pointer-events-none absolute top-0 z-10 w-40 -translate-x-1/2 rounded-lg border border-border bg-card px-3 py-2 text-xs shadow-md"
            style={{ left: tipLeft }}
            role="status"
          >
            <p className="font-medium">{dayLabel(point.day, true)}</p>
            {SERIES.map((series) => (
              <p key={series.key} className="mt-1 flex items-center justify-between gap-3 text-secondary">
                <span className="inline-flex items-center gap-1.5">
                  <span className="size-2 rounded-full" style={{ background: series.color }} />
                  {series.label}
                </span>
                <span className="font-medium tabular-nums text-foreground">{format.format(point[series.key])}</span>
              </p>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
