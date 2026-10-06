"use client";

import { useEffect, useRef, useState, type CSSProperties } from "react";
import type { ContributionDay } from "@/lib/github";
import { contributionLevelClasses } from "@/lib/github-levels";
import { cn } from "@/lib/utils";

const WEEKDAY_LABELS = [
  { day: 1, label: "Mon" },
  { day: 3, label: "Wed" },
  { day: 5, label: "Fri" },
];

type Tip = { x: number; y: number; text: string };

function describe(cell: HTMLElement) {
  const count = Number(cell.dataset.count);
  const date = new Date(`${cell.dataset.date}T00:00:00Z`).toLocaleDateString("en", {
    weekday: "short",
    month: "short",
    day: "numeric",
    year: "numeric",
    timeZone: "UTC",
  });
  const amount = count === 0 ? "No" : count;
  return `${amount} contribution${count === 1 ? "" : "s"} · ${date}`;
}

export function ContributionGrid({
  weeks,
  monthLabels,
  label,
}: {
  weeks: ContributionDay[][];
  monthLabels: { month: string; weekIndex: number }[];
  label: string;
}) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const [tip, setTip] = useState<Tip | null>(null);

  // On narrow screens the year overflows: start at the most recent weeks. Layout
  // settles after mount (fonts, reveal), so keep pinning to the end on resize
  // until the visitor scrolls the grid themselves.
  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    let touched = false;
    const toEnd = () => {
      if (!touched) el.scrollLeft = el.scrollWidth;
    };
    const markTouched = () => {
      touched = true;
    };
    const observer = new ResizeObserver(toEnd);
    observer.observe(el);
    if (el.firstElementChild) observer.observe(el.firstElementChild);
    el.addEventListener("pointerdown", markTouched);
    el.addEventListener("wheel", markTouched, { passive: true });
    el.addEventListener("touchstart", markTouched, { passive: true });
    toEnd();
    return () => {
      observer.disconnect();
      el.removeEventListener("pointerdown", markTouched);
      el.removeEventListener("wheel", markTouched);
      el.removeEventListener("touchstart", markTouched);
    };
  }, []);

  const showTip = (target: EventTarget) => {
    const cell = (target as HTMLElement).closest<HTMLElement>("[data-date]");
    const wrap = wrapRef.current;
    if (!cell || !wrap) {
      setTip(null);
      return;
    }
    const c = cell.getBoundingClientRect();
    const w = wrap.getBoundingClientRect();
    // Keep the bubble inside the section horizontally.
    const x = Math.min(Math.max(c.left - w.left + c.width / 2, 96), w.width - 96);
    setTip({ x, y: c.top - w.top, text: describe(cell) });
  };

  return (
    <div ref={wrapRef} className="relative">
      <div
        ref={scrollRef}
        role="img"
        aria-label={label}
        className="overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
        onPointerOver={(event) => showTip(event.target)}
        onPointerLeave={() => setTip(null)}
        onScroll={() => setTip(null)}
      >
        <div
          className="grid pb-1"
          style={{
            // 9px minimum lets the full year fit the desktop card (~10px cells).
            gridTemplateColumns: `auto repeat(${weeks.length}, minmax(9px, 1fr))`,
            gap: 3,
          }}
        >
          {monthLabels.map(({ month, weekIndex }) => (
            <span
              key={`${month}-${weekIndex}`}
              className="whitespace-nowrap pb-1.5 font-mono text-[10px] uppercase tracking-[0.12em] text-secondary"
              style={{ gridColumn: `${weekIndex + 2} / span 4`, gridRow: 1 }}
            >
              {month}
            </span>
          ))}

          {/* Day labels: a solid strip pinned to the left edge (plus the corner
              above it), so weeks scroll cleanly underneath on narrow screens. */}
          <span aria-hidden className="sticky left-0 z-[1] bg-card" style={{ gridColumn: 1, gridRow: 1 }} />
          <div
            className="sticky left-0 z-[1] grid bg-card pr-2"
            style={{ gridColumn: 1, gridRow: "2 / span 7", gridTemplateRows: "subgrid" }}
          >
            {WEEKDAY_LABELS.map(({ day, label: weekday }) => (
              <span
                key={weekday}
                className="self-center font-mono text-[9px] uppercase leading-none tracking-[0.08em] text-secondary"
                style={{ gridRow: day + 1 }}
              >
                {weekday}
              </span>
            ))}
          </div>

          {weeks.map((week, weekIndex) =>
            week.map((day, dayIndex) =>
              day.level < 0 ? null : (
                <div
                  key={`${weekIndex}-${dayIndex}`}
                  data-date={day.date}
                  data-count={day.count}
                  className={cn(
                    "gh-cell aspect-square rounded-[2px] transition-transform duration-150 hover:z-10 hover:scale-[1.35] hover:ring-1 hover:ring-foreground/50",
                    contributionLevelClasses[day.level] ?? contributionLevelClasses[0],
                  )}
                  style={
                    {
                      gridColumn: weekIndex + 2,
                      gridRow: dayIndex + 2,
                      "--w": weekIndex,
                      "--d": dayIndex,
                    } as CSSProperties
                  }
                />
              ),
            ),
          )}
        </div>
      </div>

      {tip && (
        <div
          role="tooltip"
          className="pointer-events-none absolute z-20 -translate-x-1/2 -translate-y-full whitespace-nowrap rounded-md border border-border bg-popover px-2.5 py-1.5 text-[11px] font-medium text-popover-foreground shadow-md"
          style={{ left: tip.x, top: tip.y - 8 }}
        >
          {tip.text}
        </div>
      )}
    </div>
  );
}
