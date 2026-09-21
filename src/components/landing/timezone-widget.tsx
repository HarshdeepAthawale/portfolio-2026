"use client";

import { useEffect, useState } from "react";
import { MapPin } from "@phosphor-icons/react";
import { heroConfig } from "@/config/hero";
import { cn } from "@/lib/utils";

function formatTime(timeZone: string) {
  return new Intl.DateTimeFormat("en", {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
    timeZone,
  }).format(new Date());
}

function getOffsetMinutes(timeZone: string, date = new Date()) {
  const parts = new Intl.DateTimeFormat("en", {
    timeZone,
    timeZoneName: "shortOffset",
  }).formatToParts(date);

  const offset = parts.find((p) => p.type === "timeZoneName")?.value ?? "GMT";
  const match = offset.match(/GMT([+-])(\d+)(?::(\d+))?/);
  if (!match) return 0;

  const sign = match[1] === "-" ? -1 : 1;
  const hours = Number(match[2]);
  const minutes = Number(match[3] ?? 0);
  return sign * (hours * 60 + minutes);
}

export function TimezoneWidget({ className }: { className?: string }) {
  const [visitorTz, setVisitorTz] = useState<string | null>(null);
  const [now, setNow] = useState(() => new Date());

  useEffect(() => {
    setVisitorTz(Intl.DateTimeFormat().resolvedOptions().timeZone);

    const interval = setInterval(() => setNow(new Date()), 30_000);
    return () => clearInterval(interval);
  }, []);

  if (!visitorTz) return null;

  const myTz = heroConfig.timezone;
  const sameTime =
    visitorTz === myTz ||
    getOffsetMinutes(visitorTz, now) === getOffsetMinutes(myTz, now);

  const myTime = formatTime(myTz);
  const yourTime = formatTime(visitorTz);

  return (
    <div
      className={cn(
        "flex shrink-0 flex-col items-center justify-center gap-1.5 rounded-xl border border-border bg-card/80 px-4 py-2.5 text-center shadow-sm backdrop-blur-sm transition-all duration-300 hover:border-foreground/15 hover:shadow-md",
        className,
      )}
    >
      {sameTime ? (
        <p className="whitespace-nowrap text-[13px] font-semibold leading-none text-foreground">
          {myTime}
        </p>
      ) : (
        <div className="space-y-1 text-[10px] leading-tight">
          <p className="whitespace-nowrap text-secondary">
            <span className="uppercase tracking-wide">Your</span>{" "}
            <span className="font-semibold text-foreground">{yourTime}</span>
          </p>
          <p className="whitespace-nowrap text-secondary">
            <span className="uppercase tracking-wide">My</span>{" "}
            <span className="font-semibold text-foreground">{myTime}</span>
          </p>
        </div>
      )}

      <p className="flex items-center justify-center gap-1 whitespace-nowrap text-[10px] leading-none text-secondary">
        <MapPin className="size-3 shrink-0" weight="fill" aria-hidden />
        {heroConfig.location}
      </p>
    </div>
  );
}
