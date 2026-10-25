/** Small shared helpers for the canvas-driven terminal pages. */

export const TAU = Math.PI * 2;
export const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v));
export const smooth = (v: number) => {
  const t = clamp(v, 0, 1);
  return t * t * (3 - 2 * t);
};
export const between = (lo: number, hi: number) => lo + Math.random() * (hi - lo);
export const sleep = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));
export const lerp2 = (a: Pt, b: Pt, t: number): Pt => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t];
export const fmt = (n: number) => Math.round(n).toLocaleString("en-US").replace(/,/g, "'");

export type Pt = [number, number];

export const media = (query: string) =>
  typeof window === "undefined" ? ({ matches: false, addEventListener() {}, removeEventListener() {} } as unknown as MediaQueryList) : window.matchMedia(query);

export const reduced = () => media("(prefers-reduced-motion: reduce)").matches;
export const narrow = () => media("(max-width: 700px)").matches;
export const finePointer = () => media("(hover: hover) and (pointer: fine)").matches;

export function make<K extends keyof HTMLElementTagNameMap>(tag: K, cls?: string, text?: string) {
  const node = document.createElement(tag);
  if (cls) node.className = cls;
  if (text !== undefined) node.textContent = text;
  return node;
}

const probe = () => {
  const canvas = document.createElement("canvas");
  return canvas.getContext("2d")!;
};
let probeCtx: CanvasRenderingContext2D | null = null;

/** "r, g, b" for any CSS colour (canvas normalises it for us). */
export function rgbOf(value: string, fallback = "#d8d4b4") {
  probeCtx ??= probe();
  probeCtx.fillStyle = fallback;
  probeCtx.fillStyle = value || fallback;
  const color = String(probeCtx.fillStyle);
  if (color.startsWith("#")) return [1, 3, 5].map((k) => parseInt(color.slice(k, k + 2), 16)).join(", ");
  return (color.match(/\d+/g) ?? ["216", "212", "180"]).slice(0, 3).join(", ");
}

/** The palette, resolved to "r, g, b" strings, read from the .hc root. */
export type Colors = { ink: string; dim: string; accent: string; bg: string; line: string; red: string; paper: string } & Record<
  "kw" | "str" | "fn" | "ty" | "num",
  string
>;

export function readColors(root: Element): Colors {
  const style = getComputedStyle(root);
  const read = (name: string, fallback: string) => rgbOf(style.getPropertyValue(name).trim(), fallback);
  return {
    ink: read("--ink", "#d8d4b4"),
    dim: read("--dim", "#a8a385"),
    accent: read("--accent", "#d8d4b4"),
    bg: read("--bg", "#0c0c0c"),
    line: read("--line", "#141414"),
    red: read("--color1", "#dd5670"),
    kw: read("--kw", "#689e80"),
    str: read("--str", "#2a593f"),
    fn: read("--fn", "#d8d4b4"),
    ty: read("--ty", "#4e5f51"),
    num: read("--num", "#d8785b"),
    paper: style.getPropertyValue("--bg").trim() || "#0c0c0c",
  };
}

export function blend(a: string, b: string, k: number) {
  const x = a.split(",").map(Number);
  const y = b.split(",").map(Number);
  return x.map((v, n) => Math.round(v + (y[n]! - v) * k)).join(", ");
}

/** Deterministic PRNG (mulberry32). */
export function rng(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** A critically-damped (by default) spring, stepped at a fixed 240Hz. */
export type Spring = { value: number; target: number; velocity: number; response: number; damping: number };
export const spring = (value: number, response = 0.35, damping = 1): Spring => ({ value, target: value, velocity: 0, response, damping });

export function advance(s: Spring, dt: number) {
  if (reduced()) {
    s.value = s.target;
    s.velocity = 0;
    return true;
  }
  const k = ((2 * Math.PI) / s.response) ** 2;
  const c = (4 * Math.PI * s.damping) / s.response;
  let left = clamp(dt, 0, 0.1);
  while (left > 1e-6) {
    const h = Math.min(left, 1 / 240);
    s.velocity += (-k * (s.value - s.target) - c * s.velocity) * h;
    s.value += s.velocity * h;
    left -= h;
  }
  if (Math.abs(s.value - s.target) < 0.002 && Math.abs(s.velocity) < 0.02) {
    s.value = s.target;
    s.velocity = 0;
    return true;
  }
  return false;
}

/** Size a canvas to its CSS box at the device pixel ratio (max 2x). */
export function fit(canvas: HTMLCanvasElement, w: number, h: number) {
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  const pw = Math.max(1, Math.round(w * dpr));
  const ph = Math.max(1, Math.round(h * dpr));
  if (canvas.width !== pw || canvas.height !== ph) {
    canvas.width = pw;
    canvas.height = ph;
  }
  canvas.style.width = `${w}px`;
  canvas.style.height = `${h}px`;
  const g = canvas.getContext("2d")!;
  g.setTransform(dpr, 0, 0, dpr, 0, 0);
  return g;
}

/** The HA monogram, drawn on an 88 x 80 grid. */
export const MARK = [
  "M0 10L10 0H16V32H30V0H46V70L36 80H30V48H16V80H0Z",
  "M50 80V24L74 0H88V80H74V60H64V80ZM64 46H74V20L64 30Z",
];
/** Outline of the whole monogram (both letters), for inside tests. */
export const MARK_SIZE: Pt = [88, 80];

let family = "";
/** A canvas font string in the page's Plex Mono. */
export function FONT(px: number) {
  family ||= getComputedStyle(document.body).getPropertyValue("--font-plex-mono").trim() || "ui-monospace";
  return `${px}px ${family}, ui-monospace, monospace`;
}
