import type { Blueprint, Day } from "@/lib/editor/types";
import { FONT, MARK, MARK_SIZE, clamp, fit, fmt, readColors, reduced, rng, type Colors } from "./util";

/**
 * The whoami hero: a drafting sheet. The HA monogram is filled by a branching
 * tree (space colonisation) with one attractor per contribution this year,
 * grown from a root under the H. Around it: dimension lines, callouts, a
 * "section A-A" of contributions per week, and a numeric twin of the drawing.
 */

const ROOT: [number, number] = [8, 92];
const GROW = { step: 1.1, kill: 1.9, reach: 14, revealMs: 4200 };

type Tree = { x: Float32Array; y: Float32Array; parent: Int32Array; depth: Uint16Array; weight: Float32Array; count: number; maxDepth: number; longest: number };

function growTree(points: number): Tree {
  const random = rng(4096 + points);
  const shape = new Path2D(MARK.join(" "));
  const probe = document.createElement("canvas").getContext("2d")!;
  const [w, h] = MARK_SIZE;
  const want = clamp(Math.round(points * 0.9), 260, 2600);
  const ax: number[] = [];
  const ay: number[] = [];
  for (let tries = 0; ax.length < want && tries < want * 12; tries++) {
    const x = random() * w;
    const y = random() * h;
    if (probe.isPointInPath(shape, x, y, "evenodd")) {
      ax.push(x);
      ay.push(y);
    }
  }
  const cap = clamp(points * 4 + 400, 1200, 9000);
  const x = new Float32Array(cap);
  const y = new Float32Array(cap);
  const parent = new Int32Array(cap).fill(-1);
  const depth = new Uint16Array(cap);
  let count = 1;
  x[0] = ROOT[0];
  y[0] = ROOT[1];
  // Spatial hash of nodes, so each attractor only looks at nearby cells.
  const size = GROW.reach;
  const cells = new Map<number, number[]>();
  const keyOf = (cx: number, cy: number) => (cx + 64) * 512 + (cy + 64);
  const add = (i: number) => {
    const k = keyOf(Math.floor(x[i]! / size), Math.floor(y[i]! / size));
    const list = cells.get(k);
    if (list) list.push(i);
    else cells.set(k, [i]);
  };
  add(0);
  // Trunk: climb straight up until the first attractors are in reach.
  for (let guard = 0; guard < 80 && count < cap; guard++) {
    let near = false;
    for (let a = 0; a < ax.length && !near; a++) near = Math.hypot(ax[a]! - x[count - 1]!, ay[a]! - y[count - 1]!) < GROW.reach;
    if (near) break;
    x[count] = x[count - 1]!;
    y[count] = y[count - 1]! - GROW.step;
    parent[count] = count - 1;
    depth[count] = depth[count - 1]! + 1;
    add(count++);
  }
  const alive = new Uint8Array(ax.length).fill(1);
  for (let round = 0, stall = 0; round < 400 && count < cap && stall < 4; round++) {
    const pull = new Map<number, [number, number, number]>();
    for (let a = 0; a < ax.length; a++) {
      if (!alive[a]) continue;
      const cx = Math.floor(ax[a]! / size);
      const cy = Math.floor(ay[a]! / size);
      let best = -1;
      let bestD = GROW.reach;
      for (let dx = -1; dx <= 1; dx++) {
        for (let dy = -1; dy <= 1; dy++) {
          for (const i of cells.get(keyOf(cx + dx, cy + dy)) ?? []) {
            const d = Math.hypot(ax[a]! - x[i]!, ay[a]! - y[i]!);
            if (d < GROW.kill) {
              alive[a] = 0;
              best = -1;
              dx = dy = 2;
              break;
            }
            if (d < bestD) {
              bestD = d;
              best = i;
            }
          }
        }
      }
      if (best < 0) continue;
      const v = pull.get(best) ?? [0, 0, 0];
      v[0] += (ax[a]! - x[best]!) / bestD;
      v[1] += (ay[a]! - y[best]!) / bestD;
      v[2] += 1;
      pull.set(best, v);
    }
    if (!pull.size) {
      stall++;
      continue;
    }
    stall = 0;
    for (const [i, [vx, vy]] of pull) {
      if (count >= cap) break;
      const len = Math.hypot(vx, vy) || 1;
      const jitter = (random() - 0.5) * 0.32;
      const nx = x[i]! + (vx / len) * GROW.step + jitter * (vy / len);
      const ny = y[i]! + (vy / len) * GROW.step - jitter * (vx / len);
      x[count] = nx;
      y[count] = ny;
      parent[count] = i;
      depth[count] = depth[i]! + 1;
      add(count++);
    }
  }
  // Each node's weight is the size of the subtree it carries.
  const weight = new Float32Array(count).fill(1);
  for (let i = count - 1; i > 0; i--) weight[parent[i]!]! += weight[i]!;
  let maxDepth = 0;
  for (let i = 0; i < count; i++) maxDepth = Math.max(maxDepth, depth[i]!);
  return { x, y, parent, depth, weight, count, maxDepth, longest: maxDepth * GROW.step };
}

export function createBlueprint(host: HTMLElement, root: HTMLElement, { points, from, to, owner }: Blueprint, days: Day[]) {
  const canvas = document.createElement("canvas");
  host.replaceChildren(canvas);
  let colors: Colors = readColors(root);
  let tree: Tree | null = null;
  let raf = 0;
  let start = 0;
  let hover: { x: number; y: number } | null = null;
  let live = true;

  // Weekly totals for the section view.
  const weeks: number[] = [];
  days.forEach((day, k) => {
    if (k % 7 === 0) weeks.push(0);
    weeks[weeks.length - 1]! += day.count;
  });
  const peakWeek = Math.max(1, ...weeks);

  function paint(now: number) {
    const W = host.clientWidth;
    const H = host.clientHeight;
    if (!W || !H) return false;
    const g = fit(canvas, W, H);
    g.clearRect(0, 0, W, H);
    const ink = (a: number) => `rgba(${colors.ink}, ${a})`;
    const dim = (a: number) => `rgba(${colors.dim}, ${a})`;
    const text = (s: string, x: number, y: number, px = 9, color = dim(0.95), align: CanvasTextAlign = "left") => {
      g.font = FONT(px);
      g.textAlign = align;
      g.fillStyle = color;
      g.fillText(s, x, y);
    };
    const narrowSheet = W < 520;
    const side = narrowSheet ? 0 : Math.min(250, W * 0.36);
    const drawW = W - side;

    // Sheet frame.
    g.strokeStyle = dim(0.35);
    g.lineWidth = 1;
    g.strokeRect(0.5, 0.5, W - 1, H - 1);
    text(`HA_ ${fmt(points)} points · 1 per contribution`, 8, 14, 9, ink(0.85));
    text(owner, 8, H - 8, 9, dim(0.8));
    text(`${from} → ${to}`, drawW - 8, H - 8, 9, dim(0.8), "right");

    // The monogram, fitted to the drawing area.
    const scale = Math.min((drawW - 70) / MARK_SIZE[0], (H - 80) / (MARK_SIZE[1] + 14));
    const ox = Math.round(36 + (drawW - 70 - MARK_SIZE[0] * scale) / 2);
    const oy = Math.round(32);
    const toX = (u: number) => ox + u * scale;
    const toY = (v: number) => oy + v * scale;

    g.save();
    g.translate(ox, oy);
    g.scale(scale, scale);
    g.setLineDash([3 / scale, 3 / scale]);
    g.lineWidth = 0.8 / scale;
    g.strokeStyle = dim(0.5);
    for (const d of MARK) g.stroke(new Path2D(d));
    g.restore();
    g.setLineDash([]);

    // Dimensions: 88 across the top, 80 down the left.
    const dimLine = (x1: number, y1: number, x2: number, y2: number, label: string) => {
      g.strokeStyle = dim(0.6);
      g.lineWidth = 0.75;
      g.beginPath();
      g.moveTo(x1, y1);
      g.lineTo(x2, y2);
      const ang = Math.atan2(y2 - y1, x2 - x1);
      for (const [px, py, a] of [
        [x1, y1, ang],
        [x2, y2, ang + Math.PI],
      ] as const) {
        g.moveTo(px, py);
        g.lineTo(px + Math.cos(a + 0.4) * 5, py + Math.sin(a + 0.4) * 5);
        g.moveTo(px, py);
        g.lineTo(px + Math.cos(a - 0.4) * 5, py + Math.sin(a - 0.4) * 5);
      }
      g.stroke();
      const mx = (x1 + x2) / 2;
      const my = (y1 + y2) / 2;
      g.save();
      g.translate(mx, my);
      if (Math.abs(x2 - x1) < Math.abs(y2 - y1)) g.rotate(-Math.PI / 2);
      g.font = FONT(9);
      const tw = g.measureText(label).width + 6;
      g.fillStyle = colors.paper;
      g.fillRect(-tw / 2, -6, tw, 11);
      text(label, 0, 3, 9, ink(0.85), "center");
      g.restore();
    };
    dimLine(toX(0), toY(0) - 12, toX(88), toY(0) - 12, "88");
    dimLine(toX(0) - 14, toY(0), toX(0) - 14, toY(80), "80");
    g.strokeStyle = dim(0.3);
    g.beginPath();
    g.moveTo(toX(0), toY(0) - 16);
    g.lineTo(toX(0), toY(0) - 4);
    g.moveTo(toX(88), toY(0) - 16);
    g.lineTo(toX(88), toY(0) - 4);
    g.moveTo(toX(0) - 18, toY(80));
    g.lineTo(toX(0) - 4, toY(80));
    g.stroke();

    // Section cut line A-A through the crossbars.
    const cut = toY(40);
    g.setLineDash([8, 3, 2, 3]);
    g.strokeStyle = dim(0.45);
    g.beginPath();
    g.moveTo(toX(-6), cut);
    g.lineTo(toX(94), cut);
    g.stroke();
    g.setLineDash([]);
    text("A", toX(-6) - 8, cut + 3, 9, ink(0.85));
    text("A", toX(94) + 3, cut + 3, 9, ink(0.85));

    // The tree, revealed in growth order.
    let shown = 0;
    if (tree) {
      const t = tree;
      const p = reduced() ? 1 : clamp((now - start) / GROW.revealMs, 0, 1);
      shown = Math.floor(t.count * (1 - (1 - p) ** 2));
      const buckets = [new Path2D(), new Path2D(), new Path2D(), new Path2D(), new Path2D()];
      const fresh = new Path2D();
      const heavy = Math.log(t.weight[0]! + 1);
      for (let i = 1; i < shown; i++) {
        const j = t.parent[i]!;
        const level = clamp(Math.floor((Math.log(t.weight[i]! + 1) / heavy) * 5), 0, 4);
        const path = i > shown - 40 && p < 1 ? fresh : buckets[level]!;
        path.moveTo(toX(t.x[j]!), toY(t.y[j]!));
        path.lineTo(toX(t.x[i]!), toY(t.y[i]!));
      }
      g.lineCap = "round";
      const widths = [0.5, 0.75, 1.05, 1.45, 1.95];
      const alphas = [0.5, 0.62, 0.74, 0.86, 0.95];
      buckets.forEach((path, k) => {
        g.lineWidth = widths[k]!;
        g.strokeStyle = ink(alphas[k]!);
        g.stroke(path);
      });
      g.lineWidth = 1.2;
      g.strokeStyle = `rgba(${colors.accent}, 0.95)`;
      g.stroke(fresh);
      // A brightening band follows the pointer's height through the canopy.
      if (hover && p >= 1) {
        const band = new Path2D();
        for (let i = 1; i < t.count; i++) {
          const yy = toY(t.y[i]!);
          if (Math.abs(yy - hover.y) > 10) continue;
          const j = t.parent[i]!;
          band.moveTo(toX(t.x[j]!), toY(t.y[j]!));
          band.lineTo(toX(t.x[i]!), yy);
        }
        g.lineWidth = 1.1;
        g.strokeStyle = `rgba(${colors.accent}, 0.8)`;
        g.stroke(band);
      }
      g.lineCap = "butt";
      // Root marker and a callout.
      g.fillStyle = `rgba(${colors.accent}, 0.95)`;
      g.fillRect(Math.round(toX(ROOT[0])) - 2, Math.round(toY(ROOT[1])) - 2, 4, 4);
      const callout = (x: number, y: number, dx: number, dy: number, label: string, value: string) => {
        g.strokeStyle = dim(0.6);
        g.lineWidth = 0.75;
        g.beginPath();
        g.moveTo(x, y);
        g.lineTo(x + dx, y + dy);
        g.lineTo(x + dx + (dx < 0 ? -18 : 18), y + dy);
        g.stroke();
        const tx = x + dx + (dx < 0 ? -20 : 20);
        text(label, tx, y + dy - 3, 8, dim(0.9), dx < 0 ? "right" : "left");
        text(value, tx, y + dy + 8, 9, `rgba(${colors.red}, 0.95)`, dx < 0 ? "right" : "left");
      };
      callout(toX(ROOT[0]), toY(ROOT[1]), -14, 2, "root", from.slice(5) || "—");
      const tip = t.count - 1;
      if (shown > tip * 0.9) callout(toX(t.x[tip]!), toY(t.y[tip]!), 20, -16, "newest", to.slice(5) || "—");
    }

    if (side) {
      // Section A-A: contributions per week as a filled profile.
      const px = drawW + 10;
      const pw = side - 18;
      const py = 24;
      const ph = Math.min(96, H * 0.36);
      g.strokeStyle = dim(0.4);
      g.strokeRect(px + 0.5, py + 0.5, pw, ph);
      text("section A-A", px, py - 6, 9, ink(0.85));
      text("per week", px + pw, py - 6, 8, dim(0.8), "right");
      if (weeks.length > 1) {
        const step = (pw - 8) / (weeks.length - 1);
        const prof = new Path2D();
        prof.moveTo(px + 4, py + ph - 4);
        weeks.forEach((v, k) => prof.lineTo(px + 4 + k * step, py + ph - 4 - (v / peakWeek) * (ph - 14)));
        prof.lineTo(px + 4 + (weeks.length - 1) * step, py + ph - 4);
        prof.closePath();
        g.fillStyle = ink(0.12);
        g.fill(prof);
        g.strokeStyle = ink(0.75);
        g.lineWidth = 0.9;
        g.stroke(prof);
        // Hatching under the curve, like a cut face.
        g.save();
        g.clip(prof);
        g.strokeStyle = dim(0.35);
        g.lineWidth = 0.6;
        g.beginPath();
        for (let x = px - ph; x < px + pw; x += 5) {
          g.moveTo(x, py + ph);
          g.lineTo(x + ph, py);
        }
        g.stroke();
        g.restore();
        const best = weeks.indexOf(peakWeek);
        const bx = px + 4 + best * step;
        g.fillStyle = `rgba(${colors.accent}, 0.95)`;
        g.fillRect(Math.round(bx) - 1.5, Math.round(py + 10) - 1.5, 3, 3);
        text(`peak ${peakWeek}`, clamp(bx, px + 24, px + pw - 24), py + ph + 11, 8, dim(0.9), "center");
      }

      // Numeric twin: the drawing as numbers.
      const ty = py + ph + 30;
      text("numeric twin", px, ty, 9, ink(0.85));
      const rows: [string, string][] = [
        ["points", fmt(points)],
        ["nodes", tree ? fmt(Math.min(shown, tree.count)) : "…"],
        ["depth", tree ? String(tree.maxDepth) : "…"],
        ["longest", tree ? `${tree.longest.toFixed(1)} u` : "…"],
        ["weeks", String(weeks.length)],
        ["busiest", `${peakWeek} / wk`],
      ];
      rows.forEach(([k, v], i) => {
        const y = ty + 14 + i * 12;
        if (y > H - 22) return;
        g.strokeStyle = dim(0.18);
        g.beginPath();
        g.moveTo(px, y + 3.5);
        g.lineTo(px + pw, y + 3.5);
        g.stroke();
        text(k, px, y, 9, dim(0.9));
        text(v, px + pw, y, 9, `rgba(${colors.red}, 0.95)`, "right");
      });
      text("scale 1:1 · units: contributions", px, H - 8, 8, dim(0.7));
    }
    return Boolean(tree) && !reduced() && now - start < GROW.revealMs + 50;
  }

  function frame(now: number) {
    raf = 0;
    if (!live) return;
    if (paint(now)) raf = requestAnimationFrame(frame);
  }
  const request = () => {
    if (!raf && live) raf = requestAnimationFrame(frame);
  };

  const observer = new ResizeObserver(request);
  observer.observe(host);
  const onMove = (event: PointerEvent) => {
    const rect = host.getBoundingClientRect();
    hover = { x: event.clientX - rect.left, y: event.clientY - rect.top };
    request();
  };
  const onLeave = () => {
    hover = null;
    request();
  };
  host.addEventListener("pointermove", onMove);
  host.addEventListener("pointerleave", onLeave);
  host.style.pointerEvents = "auto";

  // Grow off the main path so the first lines can type in meanwhile.
  const timer = window.setTimeout(() => {
    if (!live) return;
    tree = growTree(points);
    start = performance.now();
    request();
  }, 30);
  request();

  return {
    recolor() {
      colors = readColors(root);
      request();
    },
    destroy() {
      live = false;
      clearTimeout(timer);
      cancelAnimationFrame(raf);
      observer.disconnect();
      host.removeEventListener("pointermove", onMove);
      host.removeEventListener("pointerleave", onLeave);
    },
  };
}
