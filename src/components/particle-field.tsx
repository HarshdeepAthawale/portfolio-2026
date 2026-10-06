"use client";

import { useEffect, useRef } from "react";
import { FLAT_SHAPES, getShape, POINT_COUNT, type ShapeName } from "@/lib/particle-shapes";

const MORPH_MS = 1400;
const DUST = 70;

// Gold-dust ramp, back (dim sun) to front (bright bone).
const LEVELS = ["rgba(255,139,62,0.35)", "rgba(255,160,90,0.55)", "rgba(255,196,140,0.8)", "rgba(255,232,196,1)"];

const easeInOut = (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - (-2 * t + 2) ** 3 / 2);

/** A slowly turning cloud of glowing particles that morphs between shapes. */
export function ParticleField({ shape }: { shape: ShapeName }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const state = useRef({
    current: new Float32Array(POINT_COUNT * 3),
    from: new Float32Array(POINT_COUNT * 3),
    target: new Float32Array(POINT_COUNT * 3),
    morphStart: -1,
    angle: 0.6,
    sway: false,
    draw: () => {},
  });

  // Start a morph whenever the shape changes.
  useEffect(() => {
    const s = state.current;
    const points = getShape(shape);
    s.sway = FLAT_SHAPES.has(shape);
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
      const angle = s.sway ? Math.sin(s.angle * 1.4) * 0.55 : s.angle;

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

      const cosY = Math.cos(angle);
      const sinY = Math.sin(angle);
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
