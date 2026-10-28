"use client";

import { useEffect, useState } from "react";

// Minecraft 1.18+ world generation: a chunk map that fills outward from the centre.
const SIZE = 17;
const palette = ["#5f9f35", "#4f8a2c", "#7cc24c", "#3f76c4", "#2f5fa8", "#d8c27a", "#7a7a7a", "#2f6e22"];
const cells = (() => {
  const centre = (SIZE - 1) / 2;
  const list = Array.from({ length: SIZE * SIZE }, (_, i) => {
    const x = i % SIZE, y = Math.floor(i / SIZE);
    // A cheap deterministic "terrain": water bands and sand edges from a hash.
    const n = Math.sin(x * 12.9898 + y * 78.233) * 43758.5453;
    const noise = n - Math.floor(n);
    const water = Math.sin(x / 2.6) + Math.cos(y / 3.1) > 1.15;
    const color = water ? palette[3 + Math.floor(noise * 2)] : noise > 0.93 ? palette[6] : noise > 0.86 ? palette[5] : palette[[0, 1, 2, 7][Math.floor(noise * 4)]];
    return { x, y, color, d: Math.max(Math.abs(x - centre), Math.abs(y - centre)) + noise * 0.9 };
  });
  return list.sort((a, b) => a.d - b.d).map((cell, order) => ({ ...cell, order }));
})();

const tips = [
  "Tip: press Esc on any screen to go back",
  "Tip: Options lets you pick Day, Night or Auto sky",
  "35+ vulnerability reports and counting",
  "Tip: click a Right now slot to open it",
  "CSE @ TIET · Security Engineer",
];

const SESSION_KEY = "minecraft-booted";
const FULL_MS = 5200;
const QUICK_MS = 1400;

/** Shown on every full page load: a full sequence once per browser session, a short one after. */
export function BootScreen() {
  const [progress, setProgress] = useState(0);
  const [tip, setTip] = useState(0);
  const [state, setState] = useState<"running" | "fading" | "done">("running");

  useEffect(() => {
    let seen = false;
    try { seen = sessionStorage.getItem(SESSION_KEY) === "1"; sessionStorage.setItem(SESSION_KEY, "1"); } catch { /* Optional. */ }
    const duration = seen ? QUICK_MS : FULL_MS;
    const start = performance.now();
    let frame = 0;
    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / duration);
      // Fast start, a pause in the middle, then a final push, like the real loader.
      const eased = t < 0.5 ? 1.5 * t : t < 0.7 ? 0.75 + (t - 0.5) * 0.25 : 0.8 + (t - 0.7) * (0.2 / 0.3);
      setProgress(Math.round(Math.min(1, eased) * 100));
      if (t < 1) frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    // Wait for the fonts (capped) and the minimum duration, but never for every image on the page:
    // on slow phones the full "load" event can take many seconds.
    const fonts = Promise.race([document.fonts?.ready ?? Promise.resolve(), new Promise(resolve => setTimeout(resolve, 1500))]);
    const minimum = new Promise(resolve => setTimeout(resolve, duration));
    let fade: ReturnType<typeof setTimeout> | undefined;
    const finish = () => { setProgress(100); setState("fading"); fade = setTimeout(() => setState("done"), 350); };
    void Promise.all([fonts, minimum]).then(finish);
    const tipTimer = setInterval(() => setTip(value => (value + 1) % tips.length), 2200);
    const skip = (event: Event) => { if (event instanceof KeyboardEvent && event.key === "Tab") return; finish(); };
    window.addEventListener("keydown", skip, { once: true });
    window.addEventListener("pointerdown", skip, { once: true });
    return () => { cancelAnimationFrame(frame); clearInterval(tipTimer); if (fade) clearTimeout(fade); window.removeEventListener("keydown", skip); window.removeEventListener("pointerdown", skip); };
  }, []);

  if (state === "done") return null;
  const shown = Math.round(cells.length * progress / 100);
  const stage = progress < 35 ? "Loading level" : progress < 70 ? "Building terrain" : progress < 100 ? "Generating chunks" : "Ready!";
  return <div className={`mc-boot ${state === "fading" ? "mc-boot-done" : ""}`} role="status" aria-label={`Generating world, ${progress} percent`}>
    <p>Generating world</p>
    <div className="mc-chunk-map" aria-hidden="true">
      {cells.map(cell => <span key={cell.order} style={{ gridColumn: cell.x + 1, gridRow: cell.y + 1, background: cell.order < shown ? cell.color : undefined }} />)}
    </div>
    <span className="mc-boot-stage">{stage} · {progress}%</span>
    <span className="mc-boot-tip">{tips[tip]}</span>
    <small className="mc-boot-skip">Click or press any key to skip</small>
  </div>;
}
