"use client";

import { useEffect, useState } from "react";
import { Container } from "@/components/container";
import { consoleDomains, consoleSummary, pipelineStages } from "@/config/threat-console";
import { ParticleField } from "@/components/particle-field";
import { cn } from "@/lib/utils";

const STAGE_MS = 1700;

/**
 * Home-page console: a disclosure pipeline that loops recon → triage, a particle
 * model of each attack surface, and the real finding behind it.
 */
export function ThreatConsole() {
  const [{ active, stage }, setProgress] = useState({ active: 0, stage: 0 });
  const [paused, setPaused] = useState(false);
  const domain = consoleDomains[active % consoleDomains.length];

  useEffect(() => {
    if (paused || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    // Walk the pipeline; once triaged, move on to the next attack surface.
    const timer = window.setInterval(() => {
      setProgress((current) =>
        current.stage < pipelineStages.length - 1
          ? { ...current, stage: current.stage + 1 }
          : { active: (current.active + 1) % consoleDomains.length, stage: 0 },
      );
    }, STAGE_MS);
    return () => window.clearInterval(timer);
  }, [paused]);

  const select = (index: number) => setProgress({ active: index, stage: pipelineStages.length - 1 });

  return (
    <Container>
      <section
        aria-label="Threat console: findings by attack surface"
        className="animate-in-up-on-view space-y-3 border border-border bg-background p-3 text-foreground sm:p-4"
        onPointerEnter={() => setPaused(true)}
        onPointerLeave={() => setPaused(false)}
        onFocus={() => setPaused(true)}
        onBlur={() => setPaused(false)}
      >
        {/* Disclosure pipeline */}
        <div className="flex items-center gap-4 border border-border px-4 py-3">
          <span className="shrink-0 font-mono text-xs text-secondary">Disclosure pipeline</span>
          <div className="relative h-0.5 flex-1 bg-foreground/15">
            <div
              className="absolute inset-y-0 left-0 bg-sun transition-[width] duration-700 ease-out"
              style={{ width: `${((stage + 1) / pipelineStages.length) * 100}%` }}
            />
          </div>
          <span className="w-16 shrink-0 text-right font-mono text-[10px] uppercase tracking-[0.15em] text-sun">
            {pipelineStages[stage]}
          </span>
        </div>

        {/* Attack surface model */}
        <div className="corner-frame px-4 pt-4">
          <div className="flex items-center justify-between gap-3">
            <p className="flex min-w-0 items-center gap-2.5 font-mono text-xs uppercase tracking-[0.18em] text-foreground/85">
              <span aria-hidden className="size-1.5 shrink-0 rounded-full bg-sun" />
              <span key={domain.label} className="truncate animate-in fade-in duration-500">
                {domain.label}
              </span>
            </p>
            <div className="flex shrink-0 gap-1">
              {consoleDomains.map((item, index) => (
                <button
                  key={item.label}
                  type="button"
                  onClick={() => select(index)}
                  aria-label={item.label}
                  aria-pressed={index === active}
                  className={cn(
                    "h-6 w-7 border font-mono text-[10px] transition-colors",
                    index === active
                      ? "border-sun-border text-sun"
                      : "border-border text-foreground/40 hover:text-foreground",
                  )}
                >
                  {String(index + 1).padStart(2, "0")}
                </button>
              ))}
            </div>
          </div>
          <div className="relative mt-2 aspect-[16/10] sm:aspect-[2/1]">
            <ParticleField shape={domain.shape} />
          </div>
        </div>

        {/* The finding */}
        <div className="border border-border bg-card px-5 py-4 sm:py-5">
          <div className="flex items-center justify-between gap-3">
            <p className="flex items-center gap-3 font-mono text-xs uppercase tracking-[0.15em]">
              Findings
              <span className="chip-live">
                <span className="size-1.5 animate-pulse rounded-full bg-sun motion-reduce:animate-none" />
                Live
              </span>
            </p>
            <span className="font-mono text-[10px] uppercase tracking-[0.12em] text-foreground/40">
              {consoleSummary}
            </span>
          </div>
          <div key={domain.label} className="animate-in fade-in slide-in-from-bottom-1 duration-500">
            <p className="mt-4 font-display text-5xl leading-none">
              {domain.value}
              {domain.unit && <span className="ml-2 font-mono text-sm text-foreground/50">{domain.unit}</span>}
            </p>
            <p className="mt-3 text-sm leading-relaxed text-secondary sm:text-base">{domain.caption}</p>
          </div>
        </div>
      </section>
    </Container>
  );
}
