"use client";

import { useEffect, useRef, useState } from "react";
import { Container } from "@/components/container";
import { consoleDomains, consoleSummary, pipelineStages } from "@/config/threat-console";
import { getShape, POINT_COUNT, type ShapeName } from "@/lib/particle-shapes";
import { cn } from "@/lib/utils";

const STAGE_MS = 1700;
const MORPH_MS = 1400;
const DUST = 70;

// Gold-dust ramp, back (dim sun) to front (bright bone).
const LEVELS = ["rgba(255,139,62,0.35)", "rgba(255,160,90,0.55)", "rgba(255,196,140,0.8)", "rgba(255,232,196,1)"];

const easeInOut = (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - (-2 * t + 2) ** 3 / 2);

/** A slowly turning cloud of glowing particles that morphs between shapes. */
function ParticleField({ shape }: { shape: ShapeName }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const state = useRef({
    current: new Float32Array(POINT_COUNT * 3),
    from: new Float32Array(POINT_COUNT * 3),
    target: new Float32Array(POINT_COUNT * 3),
    morphStart: -1,
    angle: 0.6,
    draw: () => {},
  });

  // Start a morph whenever the shape changes.
  useEffect(() => {
    const s = state.current;
    const points = getShape(shape);
    const first = s.morphStart < 0;
    s.from.set(first ? flatten(points) : s.current);
    s.target.set(flatten(points));
    if (first) s.current.set(s.target);
    s.morphStart = first ? 0 : performance.now();
    s.draw();
  }, [shape]);

  useEffect(() => {
    const canvas = canvasRef.current!;
    const ctx = canvas.getContext("2d")!;
    const s = state.current;
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const dust = Array.from({ length: DUST }, () => ({
      x: Math.random(),
      y: Math.random(),
      speed: 0.004 + Math.random() * 0.012,
      phase: Math.random() * Math.PI * 2,
    }));
    const buckets: number[][] = LEVELS.map(() => []);
    const projected = new Float32Array(POINT_COUNT * 3);
    let width = 0;
    let height = 0;
    let dpr = 1;
    let frame = 0;
    let last = performance.now();
    let visible = true;

    const resize = () => {
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      width = canvas.clientWidth;
      height = canvas.clientHeight;
      canvas.width = Math.round(width * dpr);
      canvas.height = Math.round(height * dpr);
      s.draw();
    };

    s.draw = () => {
      if (!width) return;
      const now = performance.now();
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;
      if (!reduced) s.angle += dt * 0.35;

      // Morph: each point eases from its old spot to its new one, slightly staggered.
      const elapsed = reduced ? MORPH_MS * 2 : now - s.morphStart;
      for (let i = 0; i < POINT_COUNT; i++) {
        const delay = ((i * 37) % POINT_COUNT) / POINT_COUNT * 0.35;
        const t = easeInOut(Math.min(1, Math.max(0, elapsed / MORPH_MS - delay) / (1 - 0.35)));
        for (let k = 0; k < 3; k++) {
          const j = i * 3 + k;
          s.current[j] = s.from[j] + (s.target[j] - s.from[j]) * t;
        }
      }

      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, width, height);
      ctx.globalCompositeOperation = "lighter";

      // Ambient dust drifting upward.
      for (const d of dust) {
        if (!reduced) d.y -= d.speed * dt;
        if (d.y < 0) d.y += 1;
        const twinkle = 0.25 + 0.25 * Math.sin(now / 900 + d.phase);
        ctx.fillStyle = `rgba(255,190,130,${twinkle})`;
        ctx.fillRect(d.x * width, d.y * height, 1.2, 1.2);
      }

      const cosY = Math.cos(s.angle);
      const sinY = Math.sin(s.angle);
      const tilt = 0.3;
      const cosX = Math.cos(tilt);
      const sinX = Math.sin(tilt);
      const scale = Math.min(width, height) * 0.4;
      const cx = width / 2;
      const cy = height / 2;
      for (const bucket of buckets) bucket.length = 0;

      for (let i = 0; i < POINT_COUNT; i++) {
        const x = s.current[i * 3];
        const y = s.current[i * 3 + 1];
        const z = s.current[i * 3 + 2];
        // Rotate around Y, then tilt around X.
        const x1 = x * cosY + z * sinY;
        const z1 = -x * sinY + z * cosY;
        const y2 = y * cosX - z1 * sinX;
        const z2 = y * sinX + z1 * cosX;
        const perspective = 3 / (3 - z2);
        projected[i * 3] = cx + x1 * scale * perspective;
        projected[i * 3 + 1] = cy - y2 * scale * perspective;
        const depth = Math.min(1, Math.max(0, (z2 + 1) / 2));
        projected[i * 3 + 2] = depth;
        buckets[Math.min(LEVELS.length - 1, Math.floor(depth * LEVELS.length))].push(i);
      }

      buckets.forEach((bucket, level) => {
        ctx.fillStyle = LEVELS[level];
        const size = 0.9 + level * 0.45;
        for (const i of bucket) {
          ctx.fillRect(projected[i * 3] - size / 2, projected[i * 3 + 1] - size / 2, size, size);
        }
      });
      ctx.globalCompositeOperation = "source-over";
    };

    const loop = () => {
      if (visible && document.visibilityState === "visible") s.draw();
      frame = requestAnimationFrame(loop);
    };

    const resizeObserver = new ResizeObserver(resize);
    resizeObserver.observe(canvas);
    const visibility = new IntersectionObserver(([entry]) => {
      visible = entry.isIntersecting;
      last = performance.now();
    });
    visibility.observe(canvas);
    resize();
    if (!reduced) frame = requestAnimationFrame(loop);

    return () => {
      cancelAnimationFrame(frame);
      resizeObserver.disconnect();
      visibility.disconnect();
      s.draw = () => {};
    };
  }, []);

  return <canvas ref={canvasRef} aria-hidden className="block size-full" />;
}

function flatten(points: [number, number, number][]) {
  const out = new Float32Array(POINT_COUNT * 3);
  points.forEach((p, i) => out.set(p, i * 3));
  return out;
}

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
        className="dark animate-in-up-on-view space-y-3 border border-border bg-background p-3 text-foreground sm:p-4"
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
