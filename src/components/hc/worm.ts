import { FONT, TAU, between, clamp, finePointer, narrow, reduced, smooth, type Colors } from "./util";

/**
 * A worm made of text. It lives in a den on the status bar, tunnels under the
 * buffer, surfaces beside a word and eats it letter by letter (the letters go
 * transparent through a CSS highlight; the ghost types them back later). It
 * keeps an eye on the eye, flees the pointer, and now and then climbs inside
 * the eye, which loses track of everything until it leaves.
 */

const GLYPH = 5.5;
const GW = GLYPH * 0.6;
const GH = GLYPH * 1.08;
const EM_TOP = 1025 / 1300;
const SPEED = { crawl: 64, dig: 260, dive: 2.2 };
const BODY = { base: 46, perChar: 3.2, maxChars: 64, radius: 7.5, ring: 4.4, wave: 26, spacing: 1.5, swallow: 48 };
const WAIT = { lurk: [5200, 8200], watch: [2200, 3400], aim: 1300, wake: 2400, pause: [380, 900], pauseEvery: [1800, 3600] } as const;
const PING = { every: 1500, speed: 540 };
const VISIT = { first: 45000, every: [70000, 140000], stay: [9000, 15000], fadeIn: 1200, fadeOut: 2500, orbit: 34 } as const;
const FLEE_PX = 84;
const AVOID_PX = 150;
const IDLE_MS = 6000;
const TRAIL_MS = 6500;
const HOLE_MS = 1100;
const MARK_MS = 650;
const REPAIR_WAIT = [5000, 8000] as const;
const REPAIR_LATE = 4000;
const WORD = /[A-Za-z0-9][\w.+#-]*[A-Za-z0-9]|\d/g;
const SKIP = new Set("the and for with you this that from are can into your all not has its our was but use via one out any how".split(" "));

type Field = "b" | "s" | "e";
type P = { f: Field; x: number; y: number };
type Node = P & { id: number; under: boolean; at: number; passed: number };
export type Bite = { ch: string; range: Range; node: Text; offset: number; x: number; y: number; eaten: boolean; restored?: boolean };
type Meal = { at: number; wait: number; chars: Bite[] };
type Target =
  | { kind: "eye" }
  | { kind: "word"; node: Text; text: string; chars: Bite[]; box: { x0: number; x1: number; y0: number; y1: number }; label: string; meal?: Meal };

type Path = { f: Field | "screen"; pts: { x: number; y: number }[]; cum: number[]; total: number; pos: number; i: number };
type Goal = "home" | "hunt" | "dive" | "eye" | "leave" | "sleep";

/** Catmull-Rom through the control points, sampled every few pixels. */
function curve(f: Path["f"], points: { x: number; y: number }[]): Path {
  const pts: { x: number; y: number }[] = [];
  if (points.length < 3) pts.push(...points);
  else {
    for (let i = 0; i < points.length - 1; i++) {
      const p0 = points[Math.max(0, i - 1)]!;
      const p1 = points[i]!;
      const p2 = points[i + 1]!;
      const p3 = points[Math.min(points.length - 1, i + 2)]!;
      const steps = Math.max(2, Math.ceil(Math.hypot(p2.x - p1.x, p2.y - p1.y) / 4));
      for (let k = 0; k < steps; k++) {
        const t = k / steps;
        const t2 = t * t;
        const t3 = t2 * t;
        pts.push({
          x: 0.5 * (2 * p1.x + (-p0.x + p2.x) * t + (2 * p0.x - 5 * p1.x + 4 * p2.x - p3.x) * t2 + (-p0.x + 3 * p1.x - 3 * p2.x + p3.x) * t3),
          y: 0.5 * (2 * p1.y + (-p0.y + p2.y) * t + (2 * p0.y - 5 * p1.y + 4 * p2.y - p3.y) * t2 + (-p0.y + 3 * p1.y - 3 * p2.y + p3.y) * t3),
        });
      }
    }
    pts.push(points[points.length - 1]!);
  }
  const cum = [0];
  for (let i = 1; i < pts.length; i++) cum.push(cum[i - 1]! + Math.hypot(pts[i]!.x - pts[i - 1]!.x, pts[i]!.y - pts[i - 1]!.y));
  return { f, pts, cum, total: cum[cum.length - 1]!, pos: 0, i: 0 };
}

function along(path: Path, pos: number) {
  const { pts, cum } = path;
  if (pts.length === 1) return pts[0]!;
  let i = clamp(path.i, 0, pts.length - 2);
  while (i < pts.length - 2 && cum[i + 1]! < pos) i++;
  while (i > 0 && cum[i]! > pos) i--;
  path.i = i;
  const t = clamp((pos - cum[i]!) / (cum[i + 1]! - cum[i]! || 1), 0, 1);
  return { x: pts[i]!.x + (pts[i + 1]!.x - pts[i]!.x) * t, y: pts[i]!.y + (pts[i + 1]!.y - pts[i]!.y) * t };
}

type Options = {
  buffer: HTMLElement;
  status: HTMLElement;
  den: HTMLElement | null;
  pointer: { x: number; y: number; at: number };
  touchedAt: () => number;
  seed: () => string;
  colors: () => Colors;
  tint: () => string;
  sleeping: boolean;
};

export function createWorm({ buffer, status, den, pointer, touchedAt, seed, colors, tint, sleeping }: Options) {
  const marks = typeof Highlight === "function" && globalThis.CSS?.highlights ? new Highlight() : null;
  if (marks) CSS.highlights.set("hc-eaten", marks);
  let eatenIn = new WeakMap<Text, number[]>();
  let meals: Meal[] = [];
  const cell = { w: 7.2, h: 13 };
  let frame: { s: DOMRect; clip: { x: number; y: number; w: number; h: number }; ox: number; oy: number } | null = null;
  let right = 0;
  let eye: { cx: number; cy: number; w: number; h: number } | null = null;
  let eyeOpen: { cx: number; cy: number; w: number; h: number } | null = null;
  let eyeSeenAt = -Infinity;
  let seenWidth = -1;
  let seenHeight = -1;
  let unsettled = true;
  let changed = false;
  let shifted = false;

  let trail: Node[] = [];
  let ids = 0;
  let head: (P & { under: boolean }) | null = null;
  let travelled = 0;
  let homeAt: P | null = null;
  const eaten: string[] = [];
  let swallows: number[] = [];
  let path: Path | null = null;
  let dig: { path: Path; to: P; then: { goal: Goal; points: { x: number; y: number }[] }; marked: number } | null = null;
  let queued: { to: P; then: { goal: Goal; points: { x: number; y: number }[] } } | null = null;
  let mode: "off" | "rest" | "still" | "move" | "dig" | "lurk" | "watch" | "aim" | "inside" = sleeping ? "off" : "rest";
  let goal: Goal = "home";
  let asleep = sleeping;
  let until = 0;
  const wakeAt = performance.now() + WAIT.wake;
  let pauseUntil = 0;
  let nextPause = 0;
  let phase = 0;
  let last = 0;
  let trailUntil = 0;
  let target: Target | null = null;
  let lockedAt = -Infinity;
  let pingHitAt = -Infinity;
  let bitAt = -Infinity;
  let noticedAt = -Infinity;
  let nextPing = 0;
  let pings: { at: number; hit: boolean }[] = [];
  let holes: (P & { at: number; open: boolean })[] = [];
  let marksUnder: (P & { at: number; seed: number })[] = [];
  let nextVisit = performance.now() + VISIT.first;
  let inside: { at: number; until: number; angle: number } | null = null;
  let leftEyeAt = -Infinity;
  let grid: { d: Float32Array; s: Float32Array; nx: Float32Array; ny: Float32Array; r: Float32Array; side: Float32Array; lv: Int8Array; ch: Uint16Array } | null = null;

  // ---------------------------------------------------------------- frames

  const screen = (p: P) =>
    p.f === "s" ? { x: frame!.s.left + p.x, y: frame!.s.top + p.y } : p.f === "e" ? { x: eye!.cx + p.x, y: eye!.cy + p.y } : { x: frame!.ox + p.x, y: frame!.oy + p.y };
  const local = (f: Field, x: number, y: number): P =>
    f === "s" ? { f, x: x - frame!.s.left, y: y - frame!.s.top } : f === "e" ? { f, x: x - eye!.cx, y: y - eye!.cy } : { f, x: x - frame!.ox, y: y - frame!.oy };

  function fieldAt(x: number, y: number): Field | null {
    const { clip, s } = frame!;
    if (x >= clip.x && x < clip.x + clip.w && y >= clip.y && y < clip.y + clip.h) return "b";
    if (x >= s.left && x < s.right && y >= s.top && y < s.bottom) return "s";
    return null;
  }

  function measure() {
    const b = buffer.getBoundingClientRect();
    const clip = { x: b.left + buffer.clientLeft, y: b.top + buffer.clientTop, w: buffer.clientWidth, h: buffer.clientHeight };
    frame = { s: status.getBoundingClientRect(), clip, ox: clip.x - buffer.scrollLeft, oy: clip.y - buffer.scrollTop };
    if (buffer.clientWidth !== seenWidth) {
      seenWidth = buffer.clientWidth;
      unsettled = true;
    }
    if (buffer.scrollHeight !== seenHeight) {
      if (seenHeight >= 0) shifted = true;
      seenHeight = buffer.scrollHeight;
    }
  }

  function home(): P {
    const s = frame!.s;
    const hole = den?.getBoundingClientRect();
    if (hole?.width) return { f: "s", x: hole.left + hole.width / 2 - s.left, y: cell.h / 2 };
    return { f: "s", x: s.width - 8 * cell.w, y: cell.h / 2 };
  }

  /** Poking out of the den, leaning towards the eye. */
  function neck(at: P) {
    const lean = eyeOpen ? clamp((eyeOpen.cx - frame!.s.left - at.x) / 220, -1, 1) : 0;
    return [
      { x: at.x, y: at.y },
      { x: at.x, y: at.y - 10 },
      { x: at.x + lean * 6, y: at.y - 22 },
      { x: at.x + lean * 9, y: at.y - 28 },
    ];
  }

  const length = () => BODY.base + eaten.length * BODY.perChar;
  const awake = (now: number) => finePointer() || now - touchedAt() > IDLE_MS;

  function lock(next: Target, now: number) {
    target = next;
    lockedAt = now;
    nextPing = now + 250;
    pings = [];
  }

  function record(now: number) {
    const prev = trail[trail.length - 1];
    if (prev && head) {
      const a = prev.f === head.f ? prev : screen(prev);
      const b = prev.f === head.f ? head : screen(head);
      const d = Math.hypot(b.x - a.x, b.y - a.y);
      if (d < BODY.spacing) return;
      travelled += d;
    }
    if (head) trail.push({ id: ids++, f: head.f, x: head.x, y: head.y, under: head.under, at: travelled, passed: 0 });
    void now;
  }

  function crawlTo(f: Field, points: { x: number; y: number }[], next: Goal, now: number) {
    path = curve(f, points);
    goal = next;
    mode = "move";
    nextPause = now + between(...WAIT.pauseEvery);
  }

  /** Go underground and come up at `to`, then follow `then`. */
  function burrowTo(to: P, then: { goal: Goal; points: { x: number; y: number }[] }, now: number) {
    if (head && !head.under && head.f === "s" && homeAt && mode !== "move") {
      // Out of the den: back down the hole first.
      queued = { to, then };
      crawlTo("s", [{ x: head.x, y: head.y }, { x: homeAt.x + 6, y: homeAt.y - 15 }, { x: homeAt.x + 2, y: homeAt.y + 1 }], "dive", now);
      return;
    }
    queued = null;
    const end = screen(to);
    const from = mode === "dig" && dig ? along(dig.path, dig.path.pos) : head ? screen(head) : { x: end.x, y: end.y + 40 };
    if (head && !head.under && head.f !== "e") holes.push({ f: head.f, x: head.x, y: head.y, at: now, open: true });
    if (head) head = { ...head, under: true };
    const dx = end.x - from.x;
    const dy = end.y - from.y;
    const dist = Math.hypot(dx, dy) || 1;
    const sway = (Math.random() - 0.5) * Math.min(dist * 0.45, 160);
    const mid = { x: (from.x + end.x) / 2 - (dy / dist) * sway, y: (from.y + end.y) / 2 + (dx / dist) * sway };
    dig = { path: curve("screen", [from, mid, end]), to, then, marked: 0 };
    path = null;
    mode = "dig";
  }

  function vanish() {
    mode = "off";
    trail = [];
    head = null;
    path = null;
    dig = null;
    queued = null;
    target = null;
    goal = "home";
    holes = [];
    marksUnder = [];
    pings = [];
    swallows = [];
  }

  function goHome(now: number) {
    target = null;
    const at = home();
    burrowTo(at, { goal: "home", points: neck(at) }, now);
  }

  function tunnel(now: number, dt: number) {
    const d = dig!;
    d.path.pos = Math.min(d.path.total, d.path.pos + SPEED.dig * dt);
    const at = along(d.path, d.path.pos);
    head = { ...local(d.to.f, at.x, at.y), under: true };
    record(now);
    if (d.path.pos - d.marked >= 5) {
      d.marked = d.path.pos;
      const f = fieldAt(at.x, at.y);
      if (f) marksUnder.push({ ...local(f, at.x, at.y), at: now, seed: Math.random() });
    }
    phase += dt * 3;
    if (d.path.pos < d.path.total) return;
    dig = null;
    if (d.then.goal === "sleep") {
      vanish();
      return;
    }
    head = { ...d.to, under: false };
    record(now);
    if (head.f !== "e") holes.push({ ...d.to, at: now, open: true });
    if (d.then.goal === "home") homeAt = { ...d.to };
    crawlTo(d.to.f, d.then.points, d.then.goal, now);
  }

  function bite(now: number) {
    const t = target;
    if (t?.kind !== "word" || !head || head.f !== "b" || head.under) return;
    for (const c of t.chars) {
      if (c.eaten || Math.abs(head.x - c.x) > 3.4 || Math.abs(head.y - c.y) > 5.5) continue;
      c.eaten = true;
      bitAt = now;
      marks?.add(c.range);
      if (!t.meal) {
        t.meal = { at: now, wait: between(...REPAIR_WAIT), chars: [] };
        meals.push(t.meal);
      }
      t.meal.chars.push(c);
      t.meal.at = now;
      const list = eatenIn.get(c.node) ?? [];
      list.push(c.offset);
      eatenIn.set(c.node, list);
      eaten.unshift(c.ch);
      if (eaten.length > BODY.maxChars) eaten.length = BODY.maxChars;
      swallows.push(now);
    }
  }

  function crawl(now: number, dt: number) {
    if (now < pauseUntil) {
      phase += dt * 1.1;
      return;
    }
    if (goal === "hunt" && now >= nextPause) {
      pauseUntil = now + between(...WAIT.pause);
      nextPause = pauseUntil + between(...WAIT.pauseEvery);
      return;
    }
    // Peristalsis: speed surges and eases a little over once a second.
    const surge = (0.5 + 0.5 * Math.sin((now / 1000) * TAU * 1.15)) ** 2;
    const step = SPEED.crawl * (goal === "dive" ? SPEED.dive : 1) * (0.18 + 0.82 * surge) * dt;
    const p = path!;
    p.pos = Math.min(p.total, p.pos + step);
    const at = along(p, p.pos);
    head = { f: p.f as Field, x: at.x, y: at.y, under: false };
    phase += (step / BODY.wave) * TAU * 0.9 + dt * 0.6;
    record(now);
    bite(now);
    if (p.pos >= p.total) arrive(now);
  }

  function arrive(now: number) {
    path = null;
    if (goal === "dive" && queued) {
      const next = queued;
      queued = null;
      burrowTo(next.to, next.then, now);
      return;
    }
    if (goal === "eye") return enterEye(now);
    if (goal === "leave") return goHome(now);
    mode = goal === "home" ? "lurk" : "watch";
    const [lo, hi] = goal === "home" ? WAIT.lurk : WAIT.watch;
    until = now + between(lo, hi);
    lock({ kind: "eye" }, now);
  }

  // ------------------------------------------------------------------ words

  function nearestRight() {
    const tx = buffer.querySelector(".ln .tx");
    if (!tx || !frame) return 0;
    return tx.getBoundingClientRect().right - frame.ox - 6;
  }

  function taken(node: Text, start: number, end: number) {
    const list = eatenIn.get(node);
    return Boolean(list?.some((k) => k >= start && k < end));
  }

  function findWord(now: number): Extract<Target, { kind: "word" }> | null {
    if (!frame || right <= 0) return null;
    const walker = document.createTreeWalker(buffer, NodeFilter.SHOW_TEXT);
    const found: { node: Text; index: number; text: string; weight: number }[] = [];
    const seenBoxes = new Map<Element, DOMRect>();
    const counts = new Map<string, number>();
    const order: { text: string; node: Text; index: number }[] = [];
    for (let node = walker.nextNode() as Text | null; node; node = walker.nextNode() as Text | null) {
      const tx = node.parentElement?.closest(".tx");
      if (!tx) continue;
      let box = seenBoxes.get(tx);
      if (!box) {
        box = tx.getBoundingClientRect();
        seenBoxes.set(tx, box);
      }
      const visible = box.bottom >= frame.clip.y + cell.h && box.top <= frame.clip.y + frame.clip.h - cell.h;
      const rich = Boolean(node.parentElement?.closest(".md-link, .md-code, .md-h, .md-num"));
      for (const match of node.data.matchAll(WORD)) {
        const text = match[0];
        counts.set(text, (counts.get(text) ?? 0) + 1);
        order.push({ text, node, index: match.index! });
        if (!visible) continue;
        const digit = /\d/.test(text);
        if (text.length > 16 || (!digit && text.length < 3) || SKIP.has(text.toLowerCase()) || taken(node, match.index!, match.index! + text.length)) continue;
        const weight = rich || digit ? 3 : /^[A-Z]/.test(text) && text.length >= 4 ? 2 : text.length >= 5 ? 1 : 0;
        if (weight) found.push({ node, index: match.index!, text, weight });
      }
    }
    const nearPointer = finePointer() && pointer.x >= 0 && now - pointer.at < 2500;
    for (let tries = 0; tries < 14 && found.length; tries++) {
      let roll = Math.random() * found.reduce((sum, item) => sum + item.weight, 0);
      let pick = 0;
      while (pick < found.length - 1 && roll >= found[pick]!.weight) roll -= found[pick++]!.weight;
      const [item] = found.splice(pick, 1);
      if (!item) break;
      const range = document.createRange();
      range.setStart(item.node, item.index);
      range.setEnd(item.node, item.index + item.text.length);
      const rects = range.getClientRects();
      if (rects.length !== 1) continue;
      const rect = rects[0]!;
      if (rect.top < frame.clip.y || rect.bottom > frame.clip.y + frame.clip.h || rect.right - frame.ox > right + cell.w) continue;
      if (nearPointer && Math.hypot(pointer.x - (rect.left + rect.width / 2), pointer.y - (rect.top + rect.height / 2)) < AVOID_PX) continue;
      const chars: Bite[] = [...item.text].map((ch, k) => {
        const one = document.createRange();
        one.setStart(item.node, item.index + k);
        one.setEnd(item.node, item.index + k + 1);
        const b = one.getBoundingClientRect();
        return { ch, range: one, node: item.node, offset: item.index + k, x: b.left + b.width / 2 - frame!.ox, y: b.top + b.height / 2 - frame!.oy, eaten: false };
      });
      const same = order.filter((o) => o.text === item.text);
      const nth = same.findIndex((o) => o.node === item.node && o.index === item.index) + 1;
      const xs = chars.map((c) => c.x);
      return {
        kind: "word",
        node: item.node,
        text: item.text,
        chars,
        box: { x0: Math.min(...xs) - cell.w / 2, x1: Math.max(...xs) + cell.w / 2, y0: chars[0]!.y - cell.h / 2, y1: chars[0]!.y + cell.h / 2 },
        label: `/${item.text}  [${nth}/${counts.get(item.text) ?? 1}]`,
      };
    }
    return null;
  }

  /** Surface a few cells to one side of the word, then crawl along it. */
  function hunt(now: number, force: boolean) {
    const t = target;
    if (t?.kind !== "word") return goHome(now);
    const surfaced = head && !head.under && head.f === "b";
    const fromLeft = surfaced ? head!.x <= t.chars[0]!.x : Math.random() < 0.5;
    const seq = fromLeft ? t.chars : [...t.chars].reverse();
    const dir = fromLeft ? 1 : -1;
    const first = seq[0]!;
    const through = [{ x: first.x - dir * cell.w, y: first.y }, ...seq.map((c) => ({ x: c.x, y: c.y })), { x: seq[seq.length - 1]!.x + dir * cell.w * 1.5, y: first.y }];
    if (!force && surfaced && Math.hypot(head!.x - through[0]!.x, head!.y - through[0]!.y) < 220) {
      crawlTo("b", [{ x: head!.x, y: head!.y }, ...through], "hunt", now);
      return;
    }
    let y = first.y;
    if (Math.random() < 0.4) {
      const shiftedY = y + (Math.random() < 0.5 ? -1 : 1) * cell.h;
      const sy = frame!.oy + shiftedY;
      if (sy > frame!.clip.y + 10 && sy < frame!.clip.y + frame!.clip.h - 10) y = shiftedY;
    }
    const rise: P = { f: "b", x: clamp(first.x - dir * cell.w * between(4, 9), 6, right), y };
    burrowTo(rise, { goal: "hunt", points: [{ x: rise.x, y: rise.y }, ...through] }, now);
  }

  // -------------------------------------------------------------------- eye

  function lidBottom() {
    return (eyeOpen ? eyeOpen.cy + eyeOpen.h / 2 : eye!.cy + eye!.h * 0.37) - eye!.cy;
  }

  const toEye = () => goal === "eye" || dig?.then.goal === "eye" || queued?.then.goal === "eye";

  function visitEye(now: number) {
    nextVisit = now + between(...VISIT.every);
    lock({ kind: "eye" }, now);
    const lid = lidBottom();
    const w = eye!.w;
    const rise: P = { f: "e", x: -w * 0.16, y: lid + 26 };
    burrowTo(rise, { goal: "eye", points: [{ x: rise.x, y: rise.y }, { x: -w * 0.06, y: lid + 6 }, { x: -w * 0.02, y: lid * 0.4 }, { x: 0, y: 0 }] }, now);
  }

  function enterEye(now: number) {
    inside = { at: now, until: now + between(...VISIT.stay), angle: 0 };
    if (head) head = { ...head, under: true };
    mode = "inside";
    goal = "home";
    target = null;
    pings = [];
  }

  function orbit(now: number, dt: number) {
    const v = inside!;
    v.angle += dt * 2.1;
    const r = Math.min(VISIT.orbit, eye!.h * 0.28);
    head = { f: "e", x: Math.cos(v.angle) * r * 1.3, y: Math.sin(v.angle * 1.37) * r * 0.55, under: true };
    record(now);
    phase += dt * 1.6;
    if (now >= v.until || now - eyeSeenAt > 400) leaveEye(now);
  }

  function leaveEye(now: number) {
    inside = null;
    leftEyeAt = now;
    const lid = lidBottom();
    const w = eye!.w;
    head = { f: "e", x: 0, y: 0, under: false };
    record(now);
    crawlTo("e", [{ x: 0, y: 0 }, { x: w * 0.05, y: lid * 0.5 }, { x: w * 0.1, y: lid + 8 }, { x: w * 0.14, y: lid + 30 }], "leave", now);
  }

  // ------------------------------------------------------------------ brain

  function decide(now: number) {
    if (awake(now) && eyeOpen && eye && now >= nextVisit) return visitEye(now);
    const word = awake(now) && right > 0 && (mode === "lurk" || Math.random() < 0.7) ? findWord(now) : null;
    if (word) {
      lock(word, now);
      mode = "aim";
      until = now + WAIT.aim;
      return;
    }
    if (mode === "lurk") {
      until = now + between(...WAIT.lurk);
      return;
    }
    goHome(now);
  }

  function escape(now: number) {
    const word = awake(now) ? findWord(now) : null;
    if (!word) return goHome(now);
    lock(word, now);
    hunt(now, true);
  }

  /** Reduced motion: sit still in the den with the head up. */
  function pose() {
    const at = home();
    trail = [];
    travelled = 0;
    const push = (x: number, y: number, under: boolean) => {
      const prev = trail[trail.length - 1];
      if (prev) travelled += Math.hypot(x - prev.x, y - prev.y);
      trail.push({ id: ids++, f: "s", x, y, under, at: travelled, passed: 0 });
    };
    for (let y = at.y + length(); y > at.y; y -= BODY.spacing) push(at.x, y, true);
    const up = curve("s", neck(at));
    for (let pos = 0; pos <= up.total; pos += BODY.spacing) {
      const p = along(up, pos);
      push(p.x, p.y, false);
    }
    const tip = trail[trail.length - 1]!;
    head = { f: "s", x: tip.x, y: tip.y, under: false };
    homeAt = at;
    holes = [{ ...at, at: 0, open: true }];
    path = null;
    dig = null;
    goal = "home";
    target = { kind: "eye" };
    mode = "still";
  }

  /** The buffer changed size or content: drop anything anchored to old text. */
  function settle(now: number) {
    unsettled = false;
    shifted = false;
    right = nearestRight();
    if (changed) {
      marks?.clear();
      meals = [];
      eatenIn = new WeakMap();
      changed = false;
    }
    const surfaced = head && !head.under && head.f === "b";
    const hunting = goal === "hunt" && (mode === "move" || mode === "watch" || (mode === "dig" && dig?.then.goal === "hunt"));
    trail = trail.filter((p) => p.f !== "b");
    holes = holes.filter((h) => h.f !== "b");
    marksUnder = marksUnder.filter((m) => m.f !== "b");
    if (target?.kind === "word") target = null;
    if (queued?.to.f === "b") {
      const at = home();
      queued = { to: at, then: { goal: "home", points: neck(at) } };
    }
    if (reduced()) {
      mode = "rest";
      return;
    }
    if (mode === "rest" || mode === "off") return;
    if (surfaced || hunting) {
      if (head?.f === "b") head = { ...head, under: true };
      return goHome(now);
    }
    if (mode === "aim") {
      mode = "lurk";
      until = now + 1500;
      lock({ kind: "eye" }, now);
    }
    if (mode === "lurk" && homeAt && Math.abs(home().x - homeAt.x) > 2 * cell.w) goHome(now);
  }

  function guard(now: number) {
    const moved = shifted;
    shifted = false;
    if ((mode === "inside" || goal === "eye") && now - eyeSeenAt > 400) {
      if (mode === "inside") leaveEye(now);
      else goHome(now);
      return;
    }
    if (mode === "dig") {
      if (dig?.then.goal === "hunt" && !awake(now)) goHome(now);
      return;
    }
    if (!head || head.under || head.f !== "b") return;
    const at = screen(head);
    const { clip } = frame!;
    const out = at.y < clip.y || at.y > clip.y + clip.h || at.x < clip.x || at.x > clip.x + clip.w;
    const near = finePointer() && pointer.x >= 0 && now - pointer.at < 1200 && Math.hypot(pointer.x - at.x, pointer.y - at.y) < FLEE_PX;
    if (out || near || moved || !awake(now)) escape(now);
  }

  /** Forget trail behind the tail, keeping surface tracks a while to fade. */
  function trim(now: number) {
    const L = length();
    for (let i = trail.length - 1; i >= 0; i--) {
      const p = trail[i]!;
      if (travelled - p.at <= L) continue;
      if (p.passed) break;
      p.passed = now;
      if (!p.under) trailUntil = now + TRAIL_MS;
    }
    let drop = 0;
    while (drop < trail.length - 2) {
      const p = trail[drop]!;
      if (travelled - p.at <= L + 60 || (p.passed && !p.under && now - p.passed < TRAIL_MS)) break;
      drop += 1;
    }
    if (drop) trail.splice(0, drop);
    if (trail.length > 4000) trail.splice(0, trail.length - 4000);
  }

  function closeHoles(now: number) {
    const L = length();
    holes = holes.filter((h) => {
      if (!h.open) return now - h.at < HOLE_MS;
      let near = false;
      for (let i = trail.length - 1; i >= 0 && !near; i--) {
        const p = trail[i]!;
        if (travelled - p.at > L) break;
        near = !p.under && p.f === h.f && Math.abs(p.x - h.x) < 6 && Math.abs(p.y - h.y) < 6;
      }
      if (!near) {
        h.open = false;
        h.at = now;
      }
      return true;
    });
  }

  function aimRect() {
    if (!target) return null;
    if (target.kind === "eye") return eyeOpen;
    const a = screen({ f: "b", x: target.box.x0, y: target.box.y0 });
    const w = target.box.x1 - target.box.x0;
    const h = target.box.y1 - target.box.y0;
    return { cx: a.x + w / 2, cy: a.y + h / 2, w, h };
  }

  const headAt = () => (head && !head.under && frame ? screen(head) : null);

  function sonar(now: number) {
    const from = headAt();
    const tr = aimRect();
    if (!from || !tr || !awake(now)) {
      pings = [];
      return;
    }
    const hunting = mode === "move" && goal === "hunt" && target?.kind === "word";
    if (now >= nextPing && (mode === "lurk" || mode === "watch" || mode === "aim" || hunting)) {
      pings.push({ at: now, hit: false });
      nextPing = now + PING.every * (hunting ? 1.5 : 1);
    }
    const dist = Math.max(10, Math.hypot(tr.cx - from.x, tr.cy - from.y) - Math.min(tr.w, tr.h) * 0.35);
    pings = pings.filter((ping) => {
      if (!ping.hit && ((now - ping.at) * PING.speed) / 1000 >= dist) {
        ping.hit = true;
        pingHitAt = now;
        if (target?.kind === "eye") noticedAt = now;
      }
      return !ping.hit;
    });
  }

  // ------------------------------------------------------------------- draw

  function radius(s: number, L: number, now: number) {
    const t = s / L;
    const snout = 0.62 + 0.38 * smooth(s / 5);
    const tail = 1 - 0.62 * smooth((t - 0.5) / 0.5);
    const band = 1 + 0.1 * Math.exp(-(((t - 0.3) / 0.07) ** 2));
    const wave = 1 + 0.12 * Math.sin((s / BODY.wave) * TAU - phase);
    let lump = 0;
    for (const at of swallows) lump += Math.exp(-(((s - ((now - at) / 1000) * BODY.swallow) / 3.2) ** 2));
    return BODY.radius * snout * tail * band * wave * (1 + 0.32 * Math.min(1, lump));
  }

  function samples(field: Field, now: number) {
    const L = length();
    const out: { x: number; y: number; s: number; r: number; tx: number; ty: number }[] = [];
    for (let i = trail.length - 1; i >= 0; i--) {
      const p = trail[i]!;
      const s = travelled - p.at;
      if (s > L) break;
      if (p.under || p.f !== field) continue;
      const at = screen(p);
      out.push({ x: at.x, y: at.y, s, r: radius(s, L, now), tx: 0, ty: 0 });
    }
    for (let k = 0; k < out.length; k++) {
      let a: (typeof out)[number] | undefined = out[k - 1];
      let b: (typeof out)[number] | undefined = out[k + 1];
      if (a && Math.hypot(a.x - out[k]!.x, a.y - out[k]!.y) > 6) a = undefined;
      if (b && Math.hypot(b.x - out[k]!.x, b.y - out[k]!.y) > 6) b = undefined;
      const from = a ?? out[k]!;
      const to = b ?? out[k]!;
      const len = Math.hypot(from.x - to.x, from.y - to.y) || 1;
      out[k]!.tx = (from.x - to.x) / len;
      out[k]!.ty = (from.y - to.y) / len;
    }
    return out;
  }

  /** Render the body as a lit tube of tiny glyphs on a GW x GH grid. */
  function tube(g: CanvasRenderingContext2D, list: ReturnType<typeof samples>, src: string, rgb: string, paper: string) {
    if (!list.length) return;
    g.fillStyle = `rgb(${paper})`;
    g.beginPath();
    let minX = Infinity;
    let minY = Infinity;
    let maxX = -Infinity;
    let maxY = -Infinity;
    for (const q of list) {
      g.moveTo(q.x + q.r + 0.7, q.y);
      g.arc(q.x, q.y, q.r + 0.7, 0, TAU);
      minX = Math.min(minX, q.x - q.r);
      minY = Math.min(minY, q.y - q.r);
      maxX = Math.max(maxX, q.x + q.r);
      maxY = Math.max(maxY, q.y + q.r);
    }
    g.fill();
    const c0 = Math.floor(minX / GW);
    const r0 = Math.floor(minY / GH);
    const cols = Math.floor(maxX / GW) - c0 + 1;
    const rows = Math.floor(maxY / GH) - r0 + 1;
    const n = cols * rows;
    if (!grid || grid.d.length < n) {
      const m = Math.max(n, 4096);
      grid = { d: new Float32Array(m), s: new Float32Array(m), nx: new Float32Array(m), ny: new Float32Array(m), r: new Float32Array(m), side: new Float32Array(m), lv: new Int8Array(m), ch: new Uint16Array(m) };
    }
    const G = grid;
    G.d.fill(Infinity, 0, n);
    for (const q of list) {
      const ca = Math.max(0, Math.floor((q.x - q.r) / GW) - c0);
      const cb = Math.min(cols - 1, Math.floor((q.x + q.r) / GW) - c0);
      const ra = Math.max(0, Math.floor((q.y - q.r) / GH) - r0);
      const rb = Math.min(rows - 1, Math.floor((q.y + q.r) / GH) - r0);
      const r2 = q.r * q.r;
      for (let rr = ra; rr <= rb; rr++) {
        const dy = (r0 + rr + 0.5) * GH - q.y;
        for (let cc = ca; cc <= cb; cc++) {
          const dx = (c0 + cc + 0.5) * GW - q.x;
          const d2 = dx * dx + dy * dy;
          const k = rr * cols + cc;
          if (d2 >= r2 || d2 >= G.d[k]!) continue;
          G.d[k] = d2;
          G.s[k] = q.s;
          G.nx[k] = dx / q.r;
          G.ny[k] = dy / q.r;
          G.r[k] = q.r;
          G.side[k] = (dx * -q.ty + dy * q.tx) / q.r;
        }
      }
    }
    // Light from the upper left; segment rings; a dark mouth, two bright eyes.
    const lx = -0.38;
    const ly = -0.52;
    const lz = 0.76;
    const rowsWith: number[] = new Array(rows).fill(0);
    for (let k = 0; k < n; k++) {
      G.lv[k] = 0;
      if (G.d[k] === Infinity) continue;
      const u = Math.sqrt(G.d[k]!) / G.r[k]!;
      const nz = Math.sqrt(Math.max(0, 1 - u * u));
      const s = G.s[k]!;
      let v = 0.08 + 0.82 * Math.max(0, lx * G.nx[k]! + ly * G.ny[k]! + lz * nz);
      v *= 0.66 + 0.34 * (0.5 + 0.5 * Math.cos((s / BODY.ring) * TAU));
      if (s < 2.4) v *= 0.3 + 0.7 * (s / 2.4);
      else if (s < 5.2 && G.side[k]! < -0.3) v = Math.max(v, 0.95);
      if (u > 0.8) v = Math.max(v, ((u - 0.8) / 0.2) * 0.8);
      const level = Math.round(clamp((v - 0.04) / 0.9, 0, 1) ** 1.2 * 13);
      if (!level) continue;
      G.lv[k] = level;
      const lane = clamp(Math.floor(((G.side[k]! + 1) / 2) * 3), 0, 2);
      G.ch[k] = src.charCodeAt((Math.floor(s / GW) * 3 + lane) % src.length);
      rowsWith[Math.floor(k / cols)] |= 1 << level;
    }
    g.font = FONT(GLYPH);
    g.textBaseline = "alphabetic";
    g.textAlign = "left";
    for (let level = 1; level <= 13; level++) {
      const strength = level / 13;
      g.fillStyle = `rgba(${rgb}, ${(0.05 + 0.95 * strength).toFixed(3)})`;
      for (let rr = 0; rr < rows; rr++) {
        if (!(rowsWith[rr]! & (1 << level))) continue;
        let line = "";
        let first = -1;
        let lastCol = -1;
        for (let cc = 0; cc < cols; cc++) {
          if (G.lv[rr * cols + cc] !== level) continue;
          if (first < 0) first = cc;
          lastCol = cc;
        }
        for (let cc = first; cc <= lastCol; cc++) {
          const k = rr * cols + cc;
          line += G.lv[k] === level ? String.fromCharCode(G.ch[k]!) : " ";
        }
        const x = (c0 + first) * GW;
        const y = (r0 + rr) * GH + GLYPH * EM_TOP;
        g.fillText(line, x, y);
        if (strength > 0.55) g.fillText(line, x + 0.45, y);
      }
    }
  }

  const glyphAt = (g: CanvasRenderingContext2D, ch: string, x: number, y: number) => g.fillText(ch, Math.round(x / GW) * GW - GW / 2, Math.round(y / GH) * GH + GLYPH * (EM_TOP - 0.5));

  function scatter(g: CanvasRenderingContext2D, x: number, y: number, rx: number, ry: number, alpha: number, count: number, src: string, key: number, rgb: string) {
    g.fillStyle = `rgba(${rgb}, ${alpha.toFixed(3)})`;
    for (let k = 0; k < count; k++) {
      const a = ((key * 7.31 + k * 0.618) % 1) * TAU;
      const d = (key * 3.7 + k * 0.382) % 1;
      glyphAt(g, src[Math.floor((key * 977 + k * 131) % src.length)]!, x + Math.cos(a) * rx * d, y + Math.sin(a) * ry * d);
    }
  }

  function drawField(g: CanvasRenderingContext2D, field: Field, now: number, src: string, rgb: string, paper: string) {
    g.font = FONT(GLYPH);
    g.textBaseline = "alphabetic";
    g.textAlign = "left";
    if (field !== "s") {
      // Tracks left on the surface, fading.
      for (let i = trail.length - 1; i >= 0; i--) {
        const p = trail[i]!;
        if (!p.passed) continue;
        const age = (now - p.passed) / TRAIL_MS;
        if (age >= 1) break;
        if (p.under || p.f !== field || p.id % 4) continue;
        const at = screen(p);
        g.fillStyle = `rgba(${rgb}, ${(0.34 * (1 - age) ** 1.3).toFixed(3)})`;
        glyphAt(g, src[p.id % src.length]!, at.x, at.y);
      }
      for (const h of holes) {
        if (h.f !== field) continue;
        const fade = h.open ? 1 : 1 - (now - h.at) / HOLE_MS;
        if (fade <= 0) continue;
        const at = screen(h);
        g.fillStyle = `rgba(${paper}, ${fade.toFixed(3)})`;
        g.beginPath();
        g.ellipse(at.x, at.y, 8.5, 5, 0, 0, TAU);
        g.fill();
        g.fillStyle = `rgba(${rgb}, ${(0.5 * fade).toFixed(3)})`;
        const key = Math.abs(h.x * 0.37 + h.y * 0.11);
        for (let k = 0; k < 12; k++) {
          if ((key + k * 0.618) % 1 > fade + 0.15) continue;
          const a = (k / 12) * TAU;
          glyphAt(g, src[Math.floor(key * 97 + k * 13) % src.length]!, at.x + Math.cos(a) * 9.5, at.y + Math.sin(a) * 5.8);
        }
      }
      for (const m of marksUnder) {
        if (m.f !== field) continue;
        const age = (now - m.at) / MARK_MS;
        if (age >= 1) continue;
        const at = screen(m);
        g.fillStyle = `rgba(${paper}, ${(0.92 * (1 - age)).toFixed(3)})`;
        g.beginPath();
        g.ellipse(at.x, at.y, 5.5, 4, 0, 0, TAU);
        g.fill();
        scatter(g, at.x, at.y, 5, 3.5, 0.6 * (1 - age), 3, src, m.seed, rgb);
      }
      if (mode === "dig" && dig) {
        const at = along(dig.path, dig.path.pos);
        if (fieldAt(at.x, at.y) === field) {
          g.fillStyle = `rgb(${paper})`;
          g.beginPath();
          g.ellipse(at.x, at.y, 7, 5, 0, 0, TAU);
          g.fill();
          scatter(g, at.x, at.y, 6.5, 4.5, 0.75, 5, src, Math.floor(now / 70) * 0.137, rgb);
        }
      }
    }
    tube(g, samples(field, now), src, rgb, paper);
  }

  function snap(x: number) {
    const d = Math.min(window.devicePixelRatio || 1, 2);
    return Math.round(x * d) / d;
  }

  return {
    resize() {
      const style = getComputedStyle(buffer);
      cell.w = parseFloat(style.getPropertyValue("--cell-w")) || 7.2;
      cell.h = parseFloat(style.getPropertyValue("--cell-h")) || 13;
      unsettled = true;
    },
    reset() {
      changed = true;
      unsettled = true;
    },
    step(now: number, open: typeof eyeOpen, box: typeof eye) {
      const dt = last ? clamp((now - last) / 1000, 0, 0.1) : 1 / 60;
      last = now;
      eyeOpen = open;
      if (open) eyeSeenAt = now;
      if (box) eye = box;
      measure();
      if (unsettled) settle(now);
      if (mode === "off") return false;
      if (reduced()) {
        if (asleep) {
          vanish();
          return false;
        }
        if (mode !== "still") pose();
        pings = [];
        marksUnder = [];
        return false;
      }
      if (mode === "still") mode = "lurk";
      guard(now);
      if (mode === "rest") {
        if (now >= wakeAt) goHome(now);
      } else if (mode === "dig") tunnel(now, dt);
      else if (mode === "move") crawl(now, dt);
      else if (mode === "inside") orbit(now, dt);
      else {
        if (awake(now)) phase += dt * 1.1;
        if (now >= until) {
          if (mode === "aim") hunt(now, false);
          else decide(now);
        }
      }
      trim(now);
      closeHoles(now);
      marksUnder = marksUnder.filter((m) => now - m.at < MARK_MS);
      swallows = swallows.filter((at) => ((now - at) / 1000) * BODY.swallow < length() + 10);
      sonar(now);
      const resting = mode === "lurk" || mode === "watch";
      return !resting || awake(now) || pings.length > 0 || marksUnder.length > 0 || swallows.length > 0 || now < trailUntil || holes.some((h) => !h.open);
    },
    drawBody(g: CanvasRenderingContext2D, now: number) {
      if (!frame || !trail.length) return;
      const src = (eaten.join("") + seed()).replace(/\s+/g, "") || "worm";
      const rgb = tint();
      const paper = colors().bg;
      const { clip } = frame;
      g.save();
      g.beginPath();
      g.rect(clip.x, clip.y, clip.w, clip.h);
      g.clip();
      drawField(g, "b", now, src, rgb, paper);
      if (eye) drawField(g, "e", now, src, rgb, paper);
      g.restore();
      drawField(g, "s", now, src, rgb, paper);
    },
    drawRadar(g: CanvasRenderingContext2D, now: number, width: number) {
      if (!frame) return;
      const tr = aimRect();
      const from = headAt();
      const rgb = tint();
      if (tr && target?.kind === "word") {
        const t = target;
        const { clip } = frame;
        g.save();
        g.beginPath();
        g.rect(clip.x, clip.y, clip.w, clip.h);
        g.clip();
        g.fillStyle = `rgba(${rgb}, 0.24)`;
        let run: { x0: number; x1: number } | null = null;
        const flush = () => {
          if (!run) return;
          const x0 = snap(frame!.ox + run.x0);
          const y0 = snap(frame!.oy + t.box.y0);
          g.fillRect(x0, y0, snap(frame!.ox + run.x1) - x0, snap(frame!.oy + t.box.y1) - y0);
          run = null;
        };
        for (const c of t.chars) {
          if (c.eaten) {
            flush();
            continue;
          }
          if (!run) run = { x0: c.x - cell.w / 2, x1: c.x + cell.w / 2 };
          else run.x1 = c.x + cell.w / 2;
        }
        flush();
        g.restore();
      }
      if (tr) {
        // Corner brackets that snap in when a target is locked and kick on each ping.
        const kickIn = 1 - (1 - clamp((now - lockedAt) / 320, 0, 1)) ** 3;
        const scale = 1 + 0.6 * (1 - kickIn) + 0.16 * clamp(1 - (now - pingHitAt) / 260, 0, 1);
        const alpha = clamp((now - lockedAt) / 180, 0, 1);
        const hw = (tr.w / 2) * scale + 3;
        const hh = (tr.h / 2) * scale + 3;
        const arm = clamp(Math.min(tr.w, tr.h) * 0.22, 3, 9);
        g.lineWidth = 1;
        g.strokeStyle = `rgba(${rgb}, ${(0.9 * alpha).toFixed(3)})`;
        g.beginPath();
        for (const [sx, sy] of [[-1, -1], [1, -1], [-1, 1], [1, 1]] as const) {
          const x = Math.round(tr.cx + sx * hw) + 0.5;
          const y = Math.round(tr.cy + sy * hh) + 0.5;
          g.moveTo(x - sx * arm, y);
          g.lineTo(x, y);
          g.lineTo(x, y - sy * arm);
        }
        g.stroke();
        if (target?.kind === "eye" && !narrow()) {
          g.font = FONT(8);
          g.fillStyle = `rgba(${rgb}, ${(0.9 * alpha).toFixed(3)})`;
          g.fillText(`['eye:u'] ${(tr.cx / width).toFixed(7)}`, Math.round(tr.cx - tr.w / 2 - 3), Math.round(tr.cy - tr.h / 2 - 7));
        }
      }
      if (from && head?.f === "s" && (mode === "lurk" || mode === "still") && !narrow()) {
        g.font = FONT(8);
        const lines = [`['worm:u'] ${(from.x / width).toFixed(7)}`, `len ${eaten.length}`];
        const wide = Math.max(...lines.map((line) => g.measureText(line).width));
        const x = from.x + 13 + wide < width - 4 ? from.x + 13 : from.x - 13 - wide;
        g.fillStyle = `rgba(${colors().ink}, 0.6)`;
        lines.forEach((line, k) => g.fillText(line, Math.round(x), Math.round(from.y - 4 + k * 9)));
      }
    },
    nextRepair(now: number, quiet: boolean) {
      if (!frame) return null;
      const from = headAt();
      for (const meal of meals) {
        if ((target?.kind === "word" && meal === target.meal) || now - meal.at < meal.wait + (quiet ? 0 : REPAIR_LATE)) continue;
        const left = meal.chars.filter((c) => !c.restored);
        const rects = left.map((c) => c.range.getBoundingClientRect());
        if (!left.length || rects.some((r) => !r.width || r.top < frame!.clip.y || r.bottom > frame!.clip.y + frame!.clip.h)) continue;
        if (from && rects.some((r) => Math.hypot(r.left + r.width / 2 - from.x, r.top + r.height / 2 - from.y) < 70)) continue;
        return left.sort((a, b) => a.offset - b.offset);
      }
      return null;
    },
    restore(c: Bite) {
      if (c.restored) return;
      c.restored = true;
      marks?.delete(c.range);
      const list = eatenIn.get(c.node);
      if (list) eatenIn.set(c.node, list.filter((k) => k !== c.offset));
      meals = meals.filter((meal) => meal.chars.some((x) => !x.restored));
    },
    infection(now: number) {
      if (inside) return smooth(clamp((now - inside.at) / VISIT.fadeIn, 0, 1));
      return 1 - smooth(clamp((now - leftEyeAt) / VISIT.fadeOut, 0, 1));
    },
    inner() {
      return inside && head && eye && frame ? screen(head) : null;
    },
    noticed(now: number) {
      return now - noticedAt < 1700 ? headAt() : null;
    },
    hit(x: number, y: number) {
      if (!frame || !trail.length) return false;
      const L = length();
      for (let k = trail.length - 1; k >= 0; k--) {
        const p = trail[k]!;
        if (travelled - p.at > L) break;
        if (p.under) continue;
        const at = screen(p);
        if (Math.hypot(at.x - x, at.y - y) < 11) return true;
      }
      return false;
    },
    visiting() {
      return Boolean(inside) || toEye() || goal === "leave";
    },
    summon(now: number) {
      if (asleep || inside || toEye() || !eyeOpen || !eye || reduced()) return false;
      visitEye(now);
      return true;
    },
    sleep(now: number) {
      if (asleep) return;
      asleep = true;
      for (const meal of meals) meal.at = -Infinity;
      if (inside) {
        inside = null;
        leftEyeAt = now;
      }
      target = null;
      queued = null;
      goal = "home";
      pings = [];
      if (!head || !frame || mode === "rest" || reduced()) {
        vanish();
        return;
      }
      const from = mode === "dig" && dig ? along(dig.path, dig.path.pos) : screen(head);
      burrowTo(local("s", from.x, frame.s.bottom + length() + 40), { goal: "sleep", points: [] }, now);
    },
    wake(now: number) {
      if (!asleep) return;
      asleep = false;
      nextVisit = Math.max(nextVisit, now + VISIT.first);
      if (frame) goHome(now);
      else mode = "rest";
    },
    describe(now: number) {
      if (asleep) return { text: "asleep", hot: false, label: null };
      const label = target?.kind === "word" ? target.label : null;
      if (mode === "rest") return { text: "resting", hot: false, label: null };
      if (inside) return { text: "inside eye", hot: true, label: null };
      if (now - bitAt < 700) return { text: "eating", hot: true, label };
      if (label && (mode === "aim" || goal === "hunt")) return { text: "hunting", hot: true, label };
      if (toEye()) return { text: "to the eye", hot: true, label: null };
      if (mode === "dig") return { text: "tunneling", hot: false, label: null };
      if (mode === "move") return { text: "crawling", hot: false, label: null };
      return { text: "lurking", hot: false, label: null };
    },
    destroy() {
      marks?.clear();
      if (marks) CSS.highlights.delete("hc-eaten");
    },
  };
}

export type Worm = ReturnType<typeof createWorm>;
