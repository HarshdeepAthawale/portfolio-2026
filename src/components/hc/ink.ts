import { TAU, clamp, rng, smooth } from "./util";

/**
 * The wheel's ink spine: a year of contributions laid along an arc as one brush
 * stroke. Busy stretches swell it, three or more empty days break it, and the
 * busiest weeks splatter: a blot, wedge-shaped flecks thrown mostly outward,
 * droplets past their tips and a few hairlines.
 */

type Fleck = {
  /** Root on the ring, the angle it leaves at, and its full length. */
  x: number;
  y: number;
  ring: number;
  dir: number;
  len: number;
  width: number;
  bow: number;
  day: number;
  lag: number;
  fork: { at: number; turn: number; len: number } | null;
};

export type InkModel = {
  cx: number;
  cy: number;
  R: number;
  a0: number;
  a1: number;
  n: number;
  band: { t: number; a: number; w: number; drift: number }[];
  blots: { day: number; a: number; shape: number[] }[];
  flecks: Fleck[];
  drops: { fleck: Fleck; past: number; side: number; r: number }[];
  hairs: { fleck: Fleck; len: number; turn: number; kink: number }[];
};

/** Exponential smoothing run forwards then backwards, so peaks stay centred. */
function ease(values: number[], k: number) {
  const out = [...values];
  for (let i = 1; i < out.length; i++) out[i] = out[i - 1]! + k * (out[i]! - out[i - 1]!);
  for (let i = out.length - 2; i >= 0; i--) out[i] = out[i + 1]! + k * (out[i]! - out[i + 1]!);
  return out;
}

/** 1-D value noise: random knots every `step`, cosine-interpolated. */
function grain(random: () => number, count: number, step: number) {
  const knots = Array.from({ length: Math.ceil(count / step) + 2 }, () => random() * 2 - 1);
  return (i: number) => {
    const t = i / step;
    const j = Math.floor(t);
    const f = (1 - Math.cos((t - j) * Math.PI)) / 2;
    return knots[j]! * (1 - f) + knots[j + 1]! * f;
  };
}

export function buildInk(cx: number, cy: number, R: number, a0: number, a1: number, values: number[]): InkModel {
  const random = rng(5129);
  const late = rng(911);
  const n = values.length;
  const ranked = [...values].sort((a, b) => a - b);
  const busy = ranked[Math.floor(n * 0.9)] || 1;
  const flow = ease(values, 0.45);
  const mass = ease(values, 0.2);
  const angle = (day: number) => a0 + ((day + 0.5) / Math.max(1, n)) * (a1 - a0);
  const perDay = Math.abs(a1 - a0) / Math.max(1, n);

  // Days inside a run of 3+ empty days leave a gap; the stroke tapers into it.
  const gap = new Uint8Array(n);
  for (let i = 0; i < n; ) {
    let j = i;
    while (j < n && !values[j]) j++;
    if (j - i >= 3) gap.fill(1, i, j);
    i = Math.max(j, i + 1);
  }

  const fine = grain(random, n * 8, 5);
  const coarse = grain(random, n * 8, 23);
  const band: InkModel["band"] = [];
  const steps = n * 8;
  for (let i = 0; i <= steps && n; i++) {
    const t = i / steps;
    const day = clamp(Math.floor(t * n), 0, n - 1);
    let w = 1.4 + 0.5 * fine(i) + 0.3 * coarse(i) + 2.2 * Math.min(1.4, flow[day]! / busy);
    if (gap[day]) w = 0;
    else if (gap[day - 1] || gap[day + 1]) w *= 0.45;
    band.push({ t, a: a0 + t * (a1 - a0), w: Math.max(0, w), drift: 0.4 * coarse(i * 3) });
  }

  const floor = [...mass].sort((a, b) => a - b)[Math.floor(n * 0.65)] ?? 0;
  const peak = Math.max(...mass, 1);
  const peaks: number[] = [];
  for (let i = 1; i < n - 1; i++) {
    if (mass[i]! <= floor) continue;
    let top = true;
    for (let j = Math.max(0, i - 6); j <= Math.min(n - 1, i + 6) && top; j++) if (j !== i && mass[j]! > mass[i]!) top = false;
    if (top) peaks.push(i);
  }

  const blots: InkModel["blots"] = [];
  const flecks: Fleck[] = [];
  const drops: InkModel["drops"] = [];
  const hairs: InkModel["hairs"] = [];
  const spray = (day: number, strength: number, count: number, reach: number) => {
    for (let k = 0; k < count; k++) {
      const spread = (random() + random() + random() - 1.5) * perDay * 5 * (0.6 + strength);
      const at = angle(day) + spread;
      const outward = random() < 0.8;
      const ring = R + (outward ? 1.3 : -1.3);
      const len = (5 + reach * strength) * (0.15 + random() ** 1.5) * (outward ? 1 : 0.4);
      const fleck: Fleck = {
        x: cx + Math.cos(at) * ring,
        y: cy + Math.sin(at) * ring,
        ring: at,
        dir: (outward ? at : at + Math.PI) + (random() - 0.5) * 0.9,
        len,
        width: 0.5 + 2 * strength * (0.3 + 0.7 * random()),
        bow: (random() - 0.5) * 0.4 * len,
        day,
        lag: late() * 0.5,
        fork: len > 14 && random() < 0.6 ? { at: 0.4 + random() * 0.25, turn: (random() < 0.5 ? -1 : 1) * (0.3 + 0.45 * random()), len: len * (0.22 + 0.3 * random()) } : null,
      };
      flecks.push(fleck);
      if (len > 9 && random() < 0.5) {
        for (let d = 0, m = 1 + Math.floor(random() * 3); d < m; d++) drops.push({ fleck, past: 1.05 + random() * 0.4, side: (random() - 0.5) * 5, r: 0.35 + random() * 1.1 * strength });
      }
      if (outward && random() < 0.3) hairs.push({ fleck, len: len * (1.3 + 0.8 * random()), turn: (random() - 0.5) * 0.3, kink: (random() - 0.5) * 7 });
    }
  };
  for (const day of peaks) {
    const strength = clamp((mass[day]! - floor) / (peak - floor || 1), 0.12, 1);
    const size = 2 + 4 * strength;
    const raw = Array.from({ length: 20 }, () => size * (0.55 + 0.9 * random()));
    blots.push({ day, a: angle(day), shape: raw.map((r, k) => (raw[(k + 19) % 20]! + r + raw[(k + 1) % 20]!) / 3) });
    spray(day, strength, Math.round(9 + 30 * strength), 46);
  }
  values.forEach((v, day) => {
    if (v >= busy && !peaks.some((p) => Math.abs(p - day) <= 3)) spray(day, 0.25 + 0.3 * Math.min(1, v / (busy * 2)), 1 + Math.floor(random() * 3), 26);
  });
  return { cx, cy, R, a0, a1, n, band, blots, flecks, drops, hairs };
}

/** A wedge that narrows to a point along a bowed quadratic; returns its spine. */
function wedge(path: Path2D, x0: number, y0: number, dir: number, len: number, width: number, bow: number) {
  const ux = Math.cos(dir);
  const uy = Math.sin(dir);
  const mx = x0 + ux * len * 0.5 - uy * bow;
  const my = y0 + uy * len * 0.5 + ux * bow;
  const ex = x0 + ux * len;
  const ey = y0 + uy * len;
  const spine = (t: number): [number, number] => {
    const s = 1 - t;
    return [s * s * x0 + 2 * s * t * mx + t * t * ex, s * s * y0 + 2 * s * t * my + t * t * ey];
  };
  const sides: [number, number][][] = [[], []];
  for (let i = 0; i <= 8; i++) {
    const t = i / 8;
    const [x, y] = spine(t);
    // Tangent of the quadratic, for the normal.
    const tx = 2 * (1 - t) * (mx - x0) + 2 * t * (ex - mx);
    const ty = 2 * (1 - t) * (my - y0) + 2 * t * (ey - my);
    const tl = Math.hypot(tx, ty) || 1;
    const half = (width / 2) * (1 - t) ** 0.9;
    sides[0]!.push([x - (ty / tl) * half, y + (tx / tl) * half]);
    sides[1]!.push([x + (ty / tl) * half, y - (tx / tl) * half]);
  }
  path.moveTo(...sides[0]![0]!);
  for (const p of sides[0]!) path.lineTo(...p);
  for (let i = 8; i >= 0; i--) path.lineTo(...sides[1]![i]!);
  path.closePath();
  return spine;
}

export type Grow = (day: number, lag: number) => number;

/** The ink as two paths: filled body and stroked hairlines. */
export function inkPaths(m: InkModel, grow: Grow = () => 1, shown: (t: number) => boolean = () => true, bend: (a: number) => number = () => 0) {
  const body = new Path2D();
  const hairs = new Path2D();
  let outer: [number, number][] = [];
  let inner: [number, number][] = [];
  const close = () => {
    if (outer.length > 1) {
      body.moveTo(...outer[0]!);
      for (const p of outer) body.lineTo(...p);
      for (let i = inner.length - 1; i >= 0; i--) body.lineTo(...inner[i]!);
      body.closePath();
    }
    outer = [];
    inner = [];
  };
  for (const s of m.band) {
    if (!shown(s.t) || s.w <= 0) {
      close();
      continue;
    }
    const c = Math.cos(s.a);
    const n = Math.sin(s.a);
    outer.push([m.cx + c * (m.R + s.w / 2 + s.drift), m.cy + n * (m.R + s.w / 2 + s.drift)]);
    inner.push([m.cx + c * (m.R - s.w / 2 + s.drift), m.cy + n * (m.R - s.w / 2 + s.drift)]);
  }
  close();
  for (const blot of m.blots) {
    const k = smooth(grow(blot.day, 0));
    if (k <= 0) continue;
    const bx = m.cx + Math.cos(blot.a) * m.R;
    const by = m.cy + Math.sin(blot.a) * m.R;
    // Stretched along the ring (tangent), squashed across it.
    const tx = -Math.sin(blot.a);
    const ty = Math.cos(blot.a);
    const count = blot.shape.length;
    for (let i = 0; i <= count; i++) {
      const t = ((i % count) / count) * TAU;
      const r = blot.shape[i % count]! * k;
      const x = bx + tx * Math.cos(t) * r * 1.9 + Math.cos(blot.a) * Math.sin(t) * r;
      const y = by + ty * Math.cos(t) * r * 1.9 + Math.sin(blot.a) * Math.sin(t) * r;
      if (i) body.lineTo(x, y);
      else body.moveTo(x, y);
    }
    body.closePath();
  }
  for (const f of m.flecks) {
    const k = smooth(grow(f.day, f.lag));
    if (k <= 0) continue;
    const b = bend(f.ring);
    const spine = wedge(body, f.x, f.y, f.dir + b, f.len * k, f.width, f.bow * k - b * f.len * 0.35);
    if (f.fork && k > 0.5) {
      const [fx, fy] = spine(f.fork.at);
      wedge(body, fx, fy, f.dir + f.fork.turn + b * 1.3, f.fork.len * smooth((k - 0.5) * 2), f.width * 0.5, 0);
    }
  }
  for (const d of m.drops) {
    const f = d.fleck;
    const k = smooth(grow(f.day, f.lag + 0.35));
    if (k <= 0) continue;
    const dir = f.dir + bend(f.ring) * 1.15;
    const far = f.len * d.past * (0.6 + 0.4 * k);
    const x = f.x + Math.cos(dir) * far - Math.sin(dir) * d.side;
    const y = f.y + Math.sin(dir) * far + Math.cos(dir) * d.side;
    body.moveTo(x + d.r * k, y);
    body.arc(x, y, d.r * k, 0, TAU);
  }
  for (const h of m.hairs) {
    const f = h.fleck;
    const k = smooth(grow(f.day, f.lag + 0.2));
    if (k <= 0) continue;
    const len = h.len * k;
    const b = bend(f.ring);
    const mid = f.dir + h.turn + b * 0.6;
    const tip = f.dir + h.turn + b * 1.5;
    hairs.moveTo(f.x, f.y);
    hairs.quadraticCurveTo(f.x + Math.cos(mid) * len * 0.5 + h.kink, f.y + Math.sin(mid) * len * 0.5 - h.kink, f.x + Math.cos(tip) * len, f.y + Math.sin(tip) * len);
  }
  return { body, hairs };
}

export function paintInk(g: CanvasRenderingContext2D, paths: { body: Path2D; hairs: Path2D }, rgb: string) {
  g.fillStyle = `rgba(${rgb}, 0.92)`;
  g.fill(paths.body);
  g.lineWidth = 0.4;
  g.strokeStyle = `rgba(${rgb}, 0.42)`;
  g.stroke(paths.hairs);
}
