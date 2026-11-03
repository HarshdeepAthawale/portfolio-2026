"use client";

import { useEffect, useRef, useState } from "react";

// "Generating world": a top-down map of 17×17 chunks that grows outward from the centre.
// Drawn on one small canvas (no per-frame React renders), with coherent terrain
// (ocean, beach, plains, forest, mountains) instead of random noise.
const CHUNKS = 17;
const CELL = 12; // canvas pixels per chunk; the canvas is shown at 2x with crisp pixels

function hash(x: number, y: number, seed: number) {
  const n = Math.sin(x * 127.1 + y * 311.7 + seed * 74.7) * 43758.5453;
  return n - Math.floor(n);
}

function valueNoise(x: number, y: number, seed: number) {
  const x0 = Math.floor(x), y0 = Math.floor(y), fx = x - x0, fy = y - y0;
  const sx = fx * fx * (3 - 2 * fx), sy = fy * fy * (3 - 2 * fy);
  const a = hash(x0, y0, seed), b = hash(x0 + 1, y0, seed), c = hash(x0, y0 + 1, seed), d = hash(x0 + 1, y0 + 1, seed);
  return a + (b - a) * sx + (c - a) * sy + (a - b - c + d) * sx * sy;
}

type Chunk = { x: number; y: number; color: string; shade: string; order: number };

const world: Chunk[] = (() => {
  const centre = (CHUNKS - 1) / 2;
  const list = Array.from({ length: CHUNKS * CHUNKS }, (_, i) => {
    const x = i % CHUNKS, y = Math.floor(i / CHUNKS);
    const elevation = valueNoise(x / 3.2, y / 3.2, 4) * 0.7 + valueNoise(x / 1.4, y / 1.4, 9) * 0.3;
    const wetness = valueNoise(x / 4 + 20, y / 4 + 20, 2);
    let color: string, shade: string;
    if (elevation < 0.36) { color = "#3d6fd1"; shade = "#335cb0"; }          // ocean
    else if (elevation < 0.42) { color = "#e0cf8a"; shade = "#c9b872"; }     // beach
    else if (elevation > 0.7) { color = "#8c8c8c"; shade = "#6f6f6f"; }      // mountain
    else if (wetness > 0.58) { color = "#3f7d2c"; shade = "#336a23"; }       // forest
    else { color = "#79c24a"; shade = "#66a83d"; }                           // plains
    const distance = Math.hypot(x - centre, y - centre) + hash(x, y, 1) * 1.4;
    return { x, y, color, shade, order: 0, distance };
  });
  return list.sort((a, b) => a.distance - b.distance).map((cell, order) => ({ x: cell.x, y: cell.y, color: cell.color, shade: cell.shade, order }));
})();

const tips = [
  "Press Esc on any screen to go back",
  "Options has a Day / Night sky switch",
  "35+ vulnerability reports and counting",
  "Click a slot in Right now to open it",
  "CSE @ TIET · Security Engineer",
];

const SESSION_KEY = "minecraft-booted";
const FULL_MS = 4200;
const QUICK_MS = 1200;

/** Plays once per full page load (longer on the first visit of a browser session, short after). */
export function BootScreen() {
  const canvas = useRef<HTMLCanvasElement>(null);
  const [percent, setPercent] = useState(0);
  const [tip, setTip] = useState(0);
  const [state, setState] = useState<"running" | "fading" | "done">("running");

  useEffect(() => {
    let seen = false;
    try { seen = sessionStorage.getItem(SESSION_KEY) === "1"; sessionStorage.setItem(SESSION_KEY, "1"); } catch { /* Optional. */ }
    const duration = seen ? QUICK_MS : FULL_MS;
    const ctx = canvas.current?.getContext("2d");
    const start = performance.now();
    let frame = 0, drawn = 0, settled = 0, lastPercent = -1;
    let fade: ReturnType<typeof setTimeout> | undefined;
    let finished = false;

    const paint = (chunk: Chunk, flash: boolean) => {
      if (!ctx) return;
      ctx.fillStyle = flash ? "#ffffff" : chunk.color;
      ctx.fillRect(chunk.x * CELL, chunk.y * CELL, CELL, CELL);
      if (!flash) { // a 1px lower-right edge gives each chunk a block look
        ctx.fillStyle = chunk.shade;
        ctx.fillRect(chunk.x * CELL, chunk.y * CELL + CELL - 1, CELL, 1);
        ctx.fillRect(chunk.x * CELL + CELL - 1, chunk.y * CELL, 1, CELL);
      }
    };
    if (ctx) { ctx.fillStyle = "#1b1b1b"; ctx.fillRect(0, 0, CHUNKS * CELL, CHUNKS * CELL); }

    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / duration);
      // Quick start, a slower middle, then a smooth finish.
      const eased = t < 0.6 ? t * 1.15 : 0.69 + (t - 0.6) * 0.775;
      const target = Math.min(world.length, Math.round(world.length * Math.min(1, eased)));
      while (drawn < target) paint(world[drawn++], true);
      // Chunks flash white as they appear, then settle into their colour a few chunks later.
      const settleTo = drawn === world.length ? drawn : Math.max(settled, drawn - 6);
      while (settled < settleTo) paint(world[settled++], false);
      const next = Math.round(Math.min(1, eased) * 100);
      if (next !== lastPercent && (next % 4 === 0 || next === 100)) { lastPercent = next; setPercent(next); }
      if (t < 1) frame = requestAnimationFrame(tick);
      else if (!finished) {
        finished = true;
        setPercent(100);
        fade = setTimeout(() => setState("fading"), 250);
        fade = setTimeout(() => setState("done"), 650);
      }
    };
    frame = requestAnimationFrame(tick);

    const tipTimer = setInterval(() => setTip(value => (value + 1) % tips.length), 1800);
    return () => { cancelAnimationFrame(frame); clearInterval(tipTimer); if (fade) clearTimeout(fade); };
  }, []);

  if (state === "done") return null;
  const stage = percent < 35 ? "Loading level" : percent < 75 ? "Building terrain" : percent < 100 ? "Generating chunks" : "Ready!";
  return <div className={`mc-boot ${state === "fading" ? "mc-boot-done" : ""}`} role="status" aria-label={`Generating world, ${percent} percent`}>
    <p>Generating world</p>
    <div className="mc-chunk-frame" aria-hidden="true">
      <canvas ref={canvas} width={CHUNKS * CELL} height={CHUNKS * CELL} className="mc-chunk-map" />
    </div>
    <div className="mc-boot-bar" aria-hidden="true"><div style={{ width: `${percent}%` }} /></div>
    <span className="mc-boot-stage">{stage} · {percent}%</span>
    <span className="mc-boot-tip">{tips[tip]}</span>
  </div>;
}
