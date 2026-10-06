"use client";

import { useEffect, useRef } from "react";
import {
  FLAT_SHAPES,
  getShape,
  getWireframe,
  POINT_COUNT,
  type ShapeName,
  type Wireframe,
} from "@/lib/particle-shapes";

const MORPH_MS = 1400;
const FADE_MS = 700;
const DUST = 70;

// Depth levels, back to front. Everything comes from the theme (--particle-*):
// glowing gold dust in dark mode, a fine ink line drawing in light mode.
const LEVEL_COUNT = 4;

type Palette = {
  style: "dots" | "lines";
  levels: string[];
  dust: string;
  blend: GlobalCompositeOperation;
  /** Line drawing: ink and accent-node colours as "r g b". */
  ink: string;
  node: string;
};

function readPalette(el: Element): Palette {
  const css = getComputedStyle(el);
  const v = (name: string) => css.getPropertyValue(name).trim();
  return {
    levels: Array.from({ length: LEVEL_COUNT }, (_, i) => v(`--particle-${i}`) || "rgb(255 160 90 / 0.6)"),
    dust: v("--particle-dust") || "255 190 130",
    blend: (v("--particle-blend") || "lighter") as GlobalCompositeOperation,
    style: v("--particle-style") === "lines" ? "lines" : "dots",
    ink: v("--particle-ink") || "15 12 11",
    node: v("--particle-node") || "184 80 26",
  };
}

const easeInOut = (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - (-2 * t + 2) ** 3 / 2);

/**
 * A slowly turning 3D shape: glowing particles that morph between shapes in
 * dark mode, a crossfading line drawing in light mode.
 */
export function ParticleField({ shape }: { shape: ShapeName }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const state = useRef({
    current: new Float32Array(POINT_COUNT * 3),
    from: new Float32Array(POINT_COUNT * 3),
    target: new Float32Array(POINT_COUNT * 3),
    morphStart: -1,
    angle: 0.6,
    sway: false,
    wire: null as Wireframe | null,
    prevWire: null as Wireframe | null,
    wireStart: 0,
    draw: () => {},
  });

  // Start a morph whenever the shape changes.
  useEffect(() => {
    const s = state.current;
    const points = getShape(shape);
    s.sway = FLAT_SHAPES.has(shape);
    s.prevWire = s.wire;
    s.wire = getWireframe(shape);
    s.wireStart = performance.now();
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
    const buckets: number[][] = Array.from({ length: LEVEL_COUNT }, () => []);
    let palette = readPalette(canvas);
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

      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, width, height);

      const cosY = Math.cos(angle);
      const sinY = Math.sin(angle);
      const cosX = Math.cos(0.3);
      const sinX = Math.sin(0.3);
      const scale = Math.min(width, height) * 0.4;
      const cx = width / 2;
      const cy = height / 2;
      // Rotate around Y, tilt around X, then perspective-project. Writes [x, y, depth 0..1].
      const out = new Float32Array(3);
      const project = (x: number, y: number, z: number) => {
        const x1 = x * cosY + z * sinY;
        const z1 = -x * sinY + z * cosY;
        const y2 = y * cosX - z1 * sinX;
        const z2 = y * sinX + z1 * cosX;
        const perspective = 3 / (3 - z2);
        out[0] = cx + x1 * scale * perspective;
        out[1] = cy - y2 * scale * perspective;
        out[2] = Math.min(1, Math.max(0, (z2 + 1) / 2));
        return out;
      };

      if (palette.style === "lines") {
        drawWireframes(now, project);
        return;
      }

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

      ctx.globalCompositeOperation = palette.blend;

      // Ambient dust drifting upward.
      for (const d of dust) {
        if (!reduced) d.y -= d.speed * dt;
        if (d.y < 0) d.y += 1;
        const twinkle = 0.25 + 0.25 * Math.sin(now / 900 + d.phase);
        ctx.fillStyle = `rgb(${palette.dust} / ${twinkle})`;
        ctx.fillRect(d.x * width, d.y * height, 1.2, 1.2);
      }

      for (const bucket of buckets) bucket.length = 0;
      for (let i = 0; i < POINT_COUNT; i++) {
        const p = project(s.current[i * 3], s.current[i * 3 + 1], s.current[i * 3 + 2]);
        projected[i * 3] = p[0];
        projected[i * 3 + 1] = p[1];
        projected[i * 3 + 2] = p[2];
        buckets[Math.min(LEVEL_COUNT - 1, Math.floor(p[2] * LEVEL_COUNT))].push(i);
      }

      buckets.forEach((bucket, level) => {
        ctx.fillStyle = palette.levels[level];
        const size = 0.9 + level * 0.45;
        for (const i of bucket) {
          ctx.fillRect(projected[i * 3] - size / 2, projected[i * 3 + 1] - size / 2, size, size);
        }
      });
      ctx.globalCompositeOperation = "source-over";
    };

    // Light mode: hairline strokes, fainter towards the back, with small accent
    // nodes; the outgoing shape fades out as the new one fades in.
    const LINE_ALPHA = [0.16, 0.32, 0.55, 0.85];
    const segmentBuckets: number[][] = LINE_ALPHA.map(() => []);
    const drawWireframes = (now: number, project: (x: number, y: number, z: number) => Float32Array) => {
      const fade = reduced ? 1 : easeInOut(Math.min(1, (now - s.wireStart) / FADE_MS));
      if (s.prevWire && fade < 1) drawWire(s.prevWire, 1 - fade, project);
      if (s.wire) drawWire(s.wire, fade, project);
    };

    const drawWire = (
      wire: Wireframe,
      alpha: number,
      project: (x: number, y: number, z: number) => Float32Array,
    ) => {
      const points = new Float32Array(wire.segments.length * 6);
      for (const bucket of segmentBuckets) bucket.length = 0;
      wire.segments.forEach(([a, b], i) => {
        const pa = project(a[0], a[1], a[2]);
        points[i * 6] = pa[0];
        points[i * 6 + 1] = pa[1];
        const da = pa[2];
        const pb = project(b[0], b[1], b[2]);
        points[i * 6 + 3] = pb[0];
        points[i * 6 + 4] = pb[1];
        const depth = (da + pb[2]) / 2;
        segmentBuckets[Math.min(LINE_ALPHA.length - 1, Math.floor(depth * LINE_ALPHA.length))].push(i);
      });

      ctx.lineWidth = 1;
      ctx.lineCap = "round";
      segmentBuckets.forEach((bucket, level) => {
        if (!bucket.length) return;
        ctx.beginPath();
        for (const i of bucket) {
          ctx.moveTo(points[i * 6], points[i * 6 + 1]);
          ctx.lineTo(points[i * 6 + 3], points[i * 6 + 4]);
        }
        ctx.strokeStyle = `rgb(${palette.ink} / ${LINE_ALPHA[level] * alpha})`;
        ctx.stroke();
      });

      for (const node of wire.nodes) {
        const p = project(node[0], node[1], node[2]);
        ctx.beginPath();
        ctx.arc(p[0], p[1], 2 + p[2] * 1.5, 0, Math.PI * 2);
        ctx.fillStyle = `rgb(${palette.node} / ${(0.45 + p[2] * 0.55) * alpha})`;
        ctx.fill();
      }
    };

    const loop = () => {
      if (visible && document.visibilityState === "visible") s.draw();
      frame = requestAnimationFrame(loop);
    };

    // Repaint with the new colours when the theme toggles.
    const themeObserver = new MutationObserver(() => {
      palette = readPalette(canvas);
      s.draw();
    });
    themeObserver.observe(document.documentElement, { attributes: true, attributeFilter: ["class"] });
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
      themeObserver.disconnect();
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
