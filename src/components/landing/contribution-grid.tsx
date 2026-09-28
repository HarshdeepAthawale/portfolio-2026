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

  // On narrow screens the year overflows: start at the most recent weeks.
  useEffect(() => {
    const el = scrollRef.current;
    if (el) el.scrollLeft = el.scrollWidth;
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
        className="overflow-x-auto [scrollbar-width:none] max-sm:[mask-image:linear-gradient(to_right,transparent,#000_28px)] [&::-webkit-scrollbar]:hidden"
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
              className="whitespace-nowrap pb-1.5 text-[10px] font-medium uppercase tracking-wider text-secondary"
              style={{ gridColumn: `${weekIndex + 2} / span 4`, gridRow: 1 }}
            >
              {month}
            </span>
          ))}

          {WEEKDAY_LABELS.map(({ day, label: weekday }) => (
            <span
              key={weekday}
              className="self-center pr-1.5 text-[9px] leading-none text-secondary"
              style={{ gridColumn: 1, gridRow: day + 2 }}
            >
              {weekday}
            </span>
          ))}

          {weeks.map((week, weekIndex) =>
            week.map((day, dayIndex) =>
              day.level < 0 ? null : (
                <div
                  key={`${weekIndex}-${dayIndex}`}
                  data-date={day.date}
                  data-count={day.count}
                  className={cn(
                    "gh-cell aspect-square rounded-[3px] transition-transform duration-150 hover:z-10 hover:scale-[1.35] hover:ring-1 hover:ring-foreground/50",
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
