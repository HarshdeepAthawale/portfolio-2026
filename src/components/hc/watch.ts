import { createWorm, type Worm } from "./worm";
import { FONT, advance, between, blend, clamp, finePointer, lerp2, narrow, readColors, reduced, sleep, spring, type Colors, type Pt, type Spring } from "./util";
import type { BarState } from "./bar";

/**
 * Everything drawn on the fixed overlay canvas: an ASCII eye that follows the
 * caret and the pointer, a ghost keyboard with two hand skeletons that press
 * the keys being typed (and a mouse the right hand moves to), and the "ghost"
 * that quietly re-types whatever the worm ate.
 */

const ROWS = [
  ["Backquote", "Digit1", "Digit2", "Digit3", "Digit4", "Digit5", "Digit6", "Digit7", "Digit8", "Digit9", "Digit0", "Minus", "Equal"],
  ["KeyQ", "KeyW", "KeyE", "KeyR", "KeyT", "KeyY", "KeyU", "KeyI", "KeyO", "KeyP", "BracketLeft", "BracketRight", "Backslash"],
  ["KeyA", "KeyS", "KeyD", "KeyF", "KeyG", "KeyH", "KeyJ", "KeyK", "KeyL", "Semicolon", "Quote"],
  ["KeyZ", "KeyX", "KeyC", "KeyV", "KeyB", "KeyN", "KeyM", "Comma", "Period", "Slash"],
];
const STAGGER = [0, 1.5, 1.8, 2.3];
const US = "`1234567890-=qwertyuiop[]\\asdfghjkl;'zxcvbnm,./";
const US_SHIFT: Record<string, string> = { "~": "`", "!": "1", "@": "2", "#": "3", $: "4", "%": "5", "^": "6", "&": "7", "*": "8", "(": "9", ")": "0", _: "-", "+": "=", "{": "[", "}": "]", "|": "\\", ":": ";", '"': "'", "<": ",", ">": ".", "?": "/" };
/** Touch-typing: which hand (0 left, 1 right) and finger (0 thumb .. 4 pinky) owns each key. */
const FINGER: Record<string, [number, number]> = Object.fromEntries(
  (
    [
      [0, 4, "Escape Backquote Digit1 KeyQ KeyA KeyZ ShiftLeft"],
      [0, 3, "Digit2 KeyW KeyS KeyX"],
      [0, 2, "Digit3 KeyE KeyD KeyC"],
      [0, 1, "Digit4 Digit5 KeyR KeyT KeyF KeyG KeyV KeyB"],
      [1, 1, "Digit6 Digit7 KeyY KeyU KeyH KeyJ KeyN KeyM"],
      [1, 2, "Digit8 KeyI KeyK Comma"],
      [1, 3, "Digit9 KeyO KeyL Period"],
      [1, 4, "Digit0 Minus Equal KeyP BracketLeft BracketRight Backslash Semicolon Quote Slash ShiftRight Backspace Enter"],
    ] as [number, number, string][]
  ).flatMap(([hand, finger, codes]) => codes.split(" ").map((code) => [code, [hand, finger] as [number, number]])),
);
/** Bones of a 21-point hand: wrist, thumb (1-4), then four fingers of four joints. */
const BONES = [[0, 1], [1, 2], [2, 3], [3, 4], [0, 5], [5, 6], [6, 7], [7, 8], [5, 9], [9, 10], [10, 11], [11, 12], [9, 13], [13, 14], [14, 15], [15, 16], [13, 17], [17, 18], [18, 19], [19, 20], [0, 17]];

const EYE = { upper: 0.47, lower: 0.37, iris: 0.33, reach: 0.5, rise: 0.14 };
const IRIS = { response: 0.8, near: 0.92, far: 1.15, span: 2000, locked: 0.9, pulse: 1.12, pulseMs: 320 };
const TONE = { floor: 0.04, range: 0.9, gamma: 1.2, base: 0.05, bold: 0.55 };
export const GLYPH = 5.5;
export const GW = GLYPH * 0.6;
export const GH = GLYPH * 1.08;
export const EM_TOP = 1025 / 1300;
const FOCUS_MS = 1400;
const POINTER_MS = 2500;
const DESK_IDLE_MS = 2200;
const PHONE_IDLE_MS = 6000;
const REPAIR = { idle: 1200, touch: 2500, keys: 2600, every: 500 };

type Key = { x: number; y: number; wide?: number };
type Keyboard = {
  keys: Map<string, Key>;
  pitchX: number;
  pitchY: number;
  scale: number;
  mouse: { x: number; y: number; w: number; h: number } | null;
  labels: Map<string, string>;
  chars: Map<string, { code: string; shift: boolean }>;
  glow: Map<string, number>;
  clicks: [number, number];
};
type Tip = { x: Spring; y: Spring; pressUntil: number };
type Hand = { side: number; rest: Pt[]; points: Pt[]; tips: Tip[]; shift: { x: Spring; y: Spring } };

type Options = {
  root: HTMLElement;
  layer: HTMLCanvasElement;
  deskHost: HTMLElement;
  eyeHost: HTMLElement;
  buffer: HTMLElement;
  status: HTMLElement;
  den: HTMLElement | null;
  wormOn: boolean;
  onState?: (state: BarState) => void;
};

export function createWatch({ root, layer, deskHost, eyeHost, buffer, status, den, wormOn, onState }: Options) {
  const g = layer.getContext("2d")!;
  let colors: Colors = readColors(root);
  let wormRgb = colors.fn;
  let width = 0;
  let height = 0;
  let raf = 0;
  let last = 0;
  let text = "·";
  let layoutMap: Map<string, string> | null = null;
  let kb: Keyboard | null = null;
  let hands: Hand[] = [];
  const pointer = { x: -1, y: -1, at: -Infinity, drift: [0, 0] as Pt };
  const focus = { x: 0, y: 0, at: -Infinity };
  const desk = { vis: spring(0, 0.3), mouse: spring(0, 0.28), ox: spring(0, 0.18), oy: spring(0, 0.18), lastAt: -Infinity, mode: "keys" as "keys" | "mouse" };
  const ghost = { x: -1, y: -1, at: -Infinity };
  let lastTouch = performance.now();
  let flashes: { range: Range; ch: string; at: number }[] = [];
  let caret: { range: Range; before: boolean } | null = null;
  let externalAt = -Infinity;
  let typedAt = -Infinity;
  let repairing = false;
  let stateKey = "";
  let summoned: { at: number; started: boolean } | null = null;
  let redMix = 0;
  let hovering = false;

  const eye = {
    state: "closed" as "closed" | "opening" | "open" | "closing",
    lid: spring(0, 0.45),
    gx: spring(0, 0.35),
    gy: spring(0, 0.35),
    dil: spring(0.45, 0.5),
    iz: spring(IRIS.near, IRIS.response),
    spin: 0,
    openNow: 0,
    blinkAt: -Infinity,
    nextBlinkAt: performance.now() + between(2600, 6400),
    born: performance.now(),
    offset: 0,
    pulseUntil: 0,
    locked: null as Pt | null,
    levels: null as Int8Array | null,
    pupil: { x: 0, y: 0, ri: 0, rp: 0 },
    lost: [0, 0] as Pt,
    lostAt: 0,
  };

  const worm: Worm = createWorm({
    buffer,
    status,
    den,
    pointer,
    touchedAt: () => lastTouch,
    seed: () => text,
    colors: () => colors,
    tint: () => wormRgb,
    sleeping: !wormOn,
  });

  /** The worm's colour: whichever syntax colour stands furthest from ink, accent and paper. */
  function pickWorm() {
    const parse = (rgb: string) => rgb.split(",").map(Number) as [number, number, number];
    const far = (a: number[], b: number[]) => {
      const mean = (a[0]! + b[0]!) / 2;
      const [dr, dg, db] = [a[0]! - b[0]!, a[1]! - b[1]!, a[2]! - b[2]!];
      return Math.sqrt((2 + mean / 256) * dr * dr + 4 * dg * dg + (2 + (255 - mean) / 256) * db * db);
    };
    const ink = parse(colors.ink);
    const accent = parse(colors.accent);
    const bg = parse(colors.bg);
    let best = colors.ink;
    let score = -1;
    for (const name of ["num", "kw", "ty", "fn", "str"] as const) {
      const c = parse(colors[name]);
      const value = Math.min(far(c, ink), far(c, accent), far(c, bg));
      if (value > score) {
        score = value;
        best = colors[name];
      }
    }
    return best;
  }

  let wormBase = colors.fn;
  function recolor() {
    colors = readColors(root);
    wormBase = pickWorm();
    den?.style.setProperty("--worm", wormBase);
    wormRgb = blend(wormBase, colors.red, redMix);
    wake();
  }

  function stepRed(dt: number, now: number) {
    if (summoned && !summoned.started) {
      summoned.started = worm.summon(now);
      if (!summoned.started && now - summoned.at > 4000) summoned = null;
    } else if (summoned && !worm.visiting()) summoned = null;
    const want = summoned ? 1 : 0;
    if (redMix === want) return false;
    redMix = want > redMix ? Math.min(1, redMix + dt / 0.25) : Math.max(0, redMix - dt / 1.6);
    wormRgb = blend(wormBase, colors.red, redMix);
    return true;
  }

  function resize() {
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    width = window.innerWidth;
    height = window.innerHeight;
    layer.width = Math.round(width * dpr);
    layer.height = Math.round(height * dpr);
    g.setTransform(dpr, 0, 0, dpr, 0, 0);
    layout();
    worm.resize();
    wake();
  }

  // --------------------------------------------------------------- keyboard

  function placeKeys(scale: number, box: DOMRect, withMouse: boolean) {
    const pitchX = 21.6 * scale;
    const pitchY = 26 * scale;
    const home = box.top + box.height * 0.5 - 0.5 * pitchY;
    const keys = new Map<string, Key>();
    ROWS.forEach((row, r) => row.forEach((code, c) => keys.set(code, { x: (STAGGER[r]! + c) * pitchX, y: home + (r - 2) * pitchY })));
    keys.set("Space", { x: 6.4 * pitchX, y: home + 2 * pitchY, wide: 5.6 * pitchX });
    keys.set("ShiftLeft", { x: 0.4 * pitchX, y: home + pitchY });
    keys.set("ShiftRight", { x: 12.8 * pitchX, y: home + pitchY });
    keys.set("Backspace", { x: 13.6 * pitchX, y: home - 2 * pitchY });
    keys.set("Enter", { x: 13.3 * pitchX, y: home });
    keys.set("Escape", { x: -1.1 * pitchX, y: home - 2 * pitchY });
    const mouse = withMouse ? { x: 14.7 * pitchX + 70 * scale, y: home + 0.2 * pitchY, w: 34 * scale, h: 56 * scale } : null;
    let lo = Infinity;
    let hi = -Infinity;
    for (const [code, key] of keys) {
      const half = key.wide ? key.wide / 2 : (code === "Escape" ? 3 : 1) * 3.6 * scale;
      lo = Math.min(lo, key.x - half);
      hi = Math.max(hi, key.x + half);
    }
    if (mouse) {
      lo = Math.min(lo, mouse.x - mouse.w / 2);
      hi = Math.max(hi, mouse.x + mouse.w / 2);
    }
    const left = box.left + box.width / 2 - (lo + hi) / 2;
    for (const key of keys.values()) key.x += left;
    if (mouse) mouse.x += left;
    return { keys, pitchX, pitchY, scale, mouse };
  }

  function layout() {
    const rect = deskHost.getBoundingClientRect();
    if (!rect.width || !rect.height) {
      kb = null;
      hands = [];
      return;
    }
    const withMouse = finePointer();
    const flat = ROWS.flat();
    const labels = new Map<string, string>();
    flat.forEach((code, n) => labels.set(code, layoutMap?.get(code) ?? US[n]!));
    labels.set("ShiftLeft", "↑");
    labels.set("ShiftRight", "↑");
    labels.set("Backspace", "←");
    labels.set("Enter", "↩");
    labels.set("Escape", "esc");
    const chars = new Map<string, { code: string; shift: boolean }>([[" ", { code: "Space", shift: false }]]);
    for (const code of flat) {
      const label = labels.get(code)!;
      if ([...label].length !== 1) continue;
      if (!chars.has(label)) chars.set(label, { code, shift: false });
      const upper = label.toUpperCase();
      if (upper !== label && !chars.has(upper)) chars.set(upper, { code, shift: true });
    }
    for (const [ch, base] of Object.entries(US_SHIFT)) if (!chars.has(ch)) chars.set(ch, { code: flat[US.indexOf(base)]!, shift: true });
    const scale = clamp(Math.min(rect.width / ((withMouse ? 470 : 380) + 40), rect.height / 190), 0.5, 1.15);
    kb = { ...placeKeys(scale, rect, withMouse), labels, chars, glow: new Map(), clicks: [0, 0] };
    hands = [makeHand(0), makeHand(1)];
  }

  /**
   * A hand resting on the home row: fingertips on their home keys, knuckles a
   * row and a half below (pulled together, middle ones higher), the wrist under
   * the index finger and the thumb on the space bar.
   */
  function restPose(side: number): Pt[] {
    const { keys, pitchX, pitchY, scale: s } = kb!;
    const inward = side === 0 ? 1 : -1;
    const home = side === 0 ? ["KeyF", "KeyD", "KeyS", "KeyA"] : ["KeyJ", "KeyK", "KeyL", "Semicolon"];
    const tips = home.map((code): Pt => [keys.get(code)!.x, keys.get(code)!.y + 3 * s]);
    const mid = (tips[0]![0] + tips[3]![0]) / 2;
    const knuckles = tips.map(([x, y], f): Pt => [mid + (x - mid) * 0.8, y + pitchY * (1.55 - 0.12 * Math.cos(((f - 1.5) / 1.5) * (Math.PI / 2)))]);
    const wrist: Pt = [mid + inward * 6 * s, tips[0]![1] + 3.7 * pitchY];
    const space = keys.get("Space")!;
    const thumbTip: Pt = [space.x - inward * 1.2 * pitchX, space.y + 2 * s];
    const root: Pt = [wrist[0] + inward * 26 * s, wrist[1] - 16 * s];
    const joint = lerp2(root, thumbTip, 0.42);
    joint[1] += 4 * s;
    const pose: Pt[] = [wrist, root, joint, lerp2(joint, thumbTip, 0.55), thumbTip];
    knuckles.forEach((knuckle, f) => pose.push(knuckle, lerp2(knuckle, tips[f]!, 0.42), lerp2(knuckle, tips[f]!, 0.74), tips[f]!));
    return pose;
  }

  function mousePose(mx: number, my: number): Pt[] {
    const { w, h } = kb!.mouse!;
    const at = (u: number, v: number): Pt => [mx + u * w, my + v * h];
    const pose: Pt[] = [at(0.1, 1.05), at(-0.45, 0.7), at(-0.62, 0.42), at(-0.7, 0.18), at(-0.66, -0.02)];
    const fingers: [Pt, Pt][] = [
      [at(-0.2, 0.2), at(-0.2, -0.38)],
      [at(0.08, 0.18), at(0.2, -0.38)],
      [at(0.32, 0.26), at(0.52, -0.08)],
      [at(0.46, 0.4), at(0.66, 0.16)],
    ];
    for (const [knuckle, tip] of fingers) pose.push(knuckle, lerp2(knuckle, tip, 0.42), lerp2(knuckle, tip, 0.74), tip);
    return pose;
  }

  function makeHand(side: number): Hand {
    const rest = restPose(side);
    return {
      side,
      rest,
      points: rest.map((p): Pt => [p[0], p[1]]),
      tips: [0, 1, 2, 3, 4].map((f) => ({ x: spring(rest[4 + f * 4]![0], 0.07, 0.82), y: spring(rest[4 + f * 4]![1], 0.07, 0.82), pressUntil: 0 })),
      shift: { x: spring(0, 0.2), y: spring(0, 0.2) },
    };
  }

  function reach(hand: Hand, finger: number, key: Key, now: number, hold: number) {
    const tip = hand.tips[finger]!;
    const [rx, ry] = hand.rest[4 + finger * 4]!;
    tip.x.target = key.x;
    tip.y.target = key.y + 3 * kb!.scale;
    tip.pressUntil = now + hold;
    hand.shift.x.target = (key.x - rx) * 0.22;
    hand.shift.y.target = (key.y + 3 * kb!.scale - ry) * 0.22;
  }

  function press(code: string, shift = false) {
    if (!kb) return;
    const key = kb.keys.get(code);
    if (!key) return;
    const now = performance.now();
    desk.lastAt = now;
    desk.mode = "keys";
    kb.glow.set(code, now);
    const [side, finger] = code === "Space" ? [1, 0] : (FINGER[code] ?? [1, 4]);
    reach(hands[side]!, finger, key, now, 120);
    if (shift) {
      const shiftKey = side === 0 ? "ShiftRight" : "ShiftLeft";
      kb.glow.set(shiftKey, now);
      reach(hands[1 - side]!, 4, kb.keys.get(shiftKey)!, now, 160);
    }
    wake();
  }

  function pressKey(code: string, shift = false) {
    externalAt = performance.now();
    press(code, shift);
  }

  function pressChar(ch: string, own = false) {
    if (!own) externalAt = performance.now();
    const hit = kb?.chars.get(ch);
    if (hit) press(hit.code, hit.shift);
  }

  function stepHands(now: number, dt: number) {
    let moving = false;
    for (const hand of hands) {
      if (hand.tips.every((tip) => now > tip.pressUntil + 250)) {
        hand.shift.x.target = 0;
        hand.shift.y.target = 0;
      }
      if (!advance(hand.shift.x, dt)) moving = true;
      if (!advance(hand.shift.y, dt)) moving = true;
      const points = hand.rest.map(([x, y]): Pt => [x + hand.shift.x.value, y + hand.shift.y.value]);
      hand.tips.forEach((tip, f) => {
        const [rx, ry] = hand.rest[4 + f * 4]!;
        if (now > tip.pressUntil) {
          tip.x.target = rx + hand.shift.x.target;
          tip.y.target = ry + hand.shift.y.target;
        }
        if (!advance(tip.x, dt)) moving = true;
        if (!advance(tip.y, dt)) moving = true;
        if (now < tip.pressUntil) moving = true;
        const end: Pt = [tip.x.value, tip.y.value];
        points[4 + f * 4] = end;
        if (f === 0) points[3] = lerp2(points[2]!, end, 0.55);
        else {
          const knuckle = points[1 + f * 4]!;
          points[2 + f * 4] = lerp2(knuckle, end, 0.42);
          points[3 + f * 4] = lerp2(knuckle, end, 0.74);
        }
      });
      hand.points = points;
    }
    return moving;
  }

  function drawKeyboard(vis: number, now: number) {
    const k = kb!;
    g.font = FONT(12 * k.scale);
    g.textAlign = "center";
    g.textBaseline = "alphabetic";
    for (const [code, key] of k.keys) {
      const at = k.glow.get(code);
      const glow = at === undefined ? 0 : clamp(1 - (now - at) / 260, 0, 1);
      g.fillStyle = `rgba(${glow > 0 ? colors.accent : colors.ink}, ${((0.2 + 0.75 * glow) * vis).toFixed(3)})`;
      if (key.wide) g.fillRect(Math.round(key.x - key.wide / 2), Math.round(key.y) - (glow > 0 ? 1 : 0), Math.round(key.wide), glow > 0 ? 2 : 1);
      else g.fillText(k.labels.get(code) ?? "", key.x, key.y + 1 + 12 * k.scale * (EM_TOP - 0.5));
    }
    g.textAlign = "left";
  }

  function drawHand(points: Pt[], vis: number, now: number, tips: Tip[] | null, label: string, side: number) {
    g.lineWidth = 0.75;
    g.strokeStyle = `rgba(${colors.ink}, ${(0.4 * vis).toFixed(3)})`;
    g.beginPath();
    for (const [a, b] of BONES) {
      g.moveTo(points[a!]![0], points[a!]![1]);
      g.lineTo(points[b!]![0], points[b!]![1]);
    }
    g.stroke();
    points.forEach(([x, y], k) => {
      const tip = tips && k > 0 && k % 4 === 0 ? tips[k / 4 - 1] : null;
      const pressing = Boolean(tip && now < tip.pressUntil);
      const size = pressing ? 4 : 2;
      g.fillStyle = pressing ? `rgba(${colors.accent}, ${vis.toFixed(3)})` : `rgba(${colors.ink}, ${(0.8 * vis).toFixed(3)})`;
      g.fillRect(Math.round(x - size / 2), Math.round(y - size / 2), size, size);
    });
    const xs = points.map(([x]) => x);
    const ys = points.map(([, y]) => y);
    const box = [Math.min(...xs) - 6, Math.min(...ys) - 6, Math.max(...xs) + 6, Math.max(...ys) + 6] as const;
    g.strokeStyle = `rgba(${colors.ink}, ${(0.28 * vis).toFixed(3)})`;
    g.strokeRect(Math.round(box[0]) + 0.5, Math.round(box[1]) + 0.5, Math.round(box[2] - box[0]), Math.round(box[3] - box[1]));
    g.font = FONT(8);
    const lw = g.measureText(label).width;
    g.fillStyle = `rgba(${colors.ink}, ${(0.7 * vis).toFixed(3)})`;
    g.fillText(label, Math.round(side === 0 ? box[0] : box[2] - lw), Math.round(box[1] - 5));
  }

  function drawMouse(vis: number, now: number): Pt {
    const { mouse } = kb!;
    const m = mouse!;
    const mx = m.x + desk.ox.value;
    const my = m.y + desk.oy.value;
    const alpha = vis * (0.35 + 0.65 * desk.mouse.value);
    g.lineWidth = 0.9;
    g.strokeStyle = `rgba(${colors.ink}, ${(0.55 * alpha).toFixed(3)})`;
    g.beginPath();
    g.roundRect(mx - m.w / 2, my - m.h / 2, m.w, m.h, m.w / 2);
    g.stroke();
    g.beginPath();
    g.moveTo(mx, my - m.h / 2);
    g.lineTo(mx, my - m.h * 0.1);
    g.moveTo(mx - m.w / 2, my - m.h * 0.1);
    g.lineTo(mx + m.w / 2, my - m.h * 0.1);
    g.stroke();
    for (let side = 0; side < 2; side++) {
      if (kb!.clicks[side]! <= now) continue;
      g.fillStyle = `rgba(${colors.accent}, ${(0.55 * alpha).toFixed(3)})`;
      g.beginPath();
      if (side === 0) g.roundRect(mx - m.w / 2 + 1, my - m.h / 2 + 1, m.w / 2 - 1.5, m.h * 0.4 - 1.5, [m.w / 2, 0, 0, 0]);
      else g.roundRect(mx + 0.5, my - m.h / 2 + 1, m.w / 2 - 1.5, m.h * 0.4 - 1.5, [0, m.w / 2, 0, 0]);
      g.fill();
    }
    g.fillStyle = `rgba(${colors.ink}, ${(0.6 * alpha).toFixed(3)})`;
    g.fillRect(Math.round(mx - 1), Math.round(my - m.h * 0.36), 2, Math.round(m.h * 0.12));
    const shown = now - ghost.at < 1600 ? ghost : pointer;
    if (desk.mouse.value > 0.4 && shown.x >= 0) {
      g.font = FONT(8);
      g.fillStyle = `rgba(${colors.ink}, ${(0.7 * alpha * desk.mouse.value).toFixed(3)})`;
      [`['mouse:u'] ${(shown.x / width).toFixed(7)}`, (shown.y / height).toFixed(7)].forEach((line, k) =>
        g.fillText(line, Math.round(mx + m.w / 2 + 12), Math.round(my - m.h / 2 + 6 + k * 9)),
      );
    }
    return [mx, my];
  }

  function drawDesk(now: number, dt: number) {
    if (!kb) return false;
    const active = now - desk.lastAt < DESK_IDLE_MS;
    desk.vis.target = active ? 1 : 0;
    desk.mouse.target = kb.mouse && desk.mode === "mouse" && active ? 1 : 0;
    let moving = !advance(desk.vis, dt);
    if (!advance(desk.mouse, dt)) moving = true;
    pointer.drift = pointer.drift.map((v) => v * Math.pow(0.02, dt)) as Pt;
    desk.ox.target = clamp(pointer.drift[0], -28, 28) * kb.scale;
    desk.oy.target = clamp(pointer.drift[1], -16, 16) * kb.scale;
    if (!advance(desk.ox, dt) || !advance(desk.oy, dt)) moving = true;
    if (stepHands(now, dt)) moving = true;
    const vis = desk.vis.value;
    if (vis < 0.01) return moving || active;
    drawKeyboard(vis, now);
    const mouseAt = kb.mouse ? drawMouse(vis, now) : null;
    const left = hands[0]!;
    drawHand(left.points, vis, now, left.tips, `['hand0:u'] ${(left.points[0]![0] / width).toFixed(7)}`, 0);
    const right = hands[1]!;
    let points = right.points;
    if (mouseAt && desk.mouse.value > 0.001) {
      const pose = mousePose(mouseAt[0], mouseAt[1]);
      points = points.map((p, k) => lerp2(p, pose[k]!, desk.mouse.value));
    }
    drawHand(points, vis, now, desk.mouse.value > 0.5 ? null : right.tips, `['hand1:u'] ${(points[0]![0] / width).toFixed(7)}`, 1);
    return moving || active;
  }

  // -------------------------------------------------------------------- eye

  function eyeBox() {
    const rect = eyeHost.getBoundingClientRect();
    if (rect.width < 60 || rect.height < 36) return null;
    return { cx: rect.left + rect.width / 2, cy: rect.top + rect.height / 2, w: rect.width, h: rect.height };
  }
  type Box = NonNullable<ReturnType<typeof eyeBox>>;

  function eyeRect(box: Box | null) {
    if (!box || eye.openNow < 0.35) return null;
    const top = box.cy - box.h * EYE.upper * eye.openNow;
    const bottom = box.cy + box.h * EYE.lower * eye.openNow;
    return { cx: box.cx, cy: (top + bottom) / 2, w: box.w * 0.94, h: bottom - top };
  }

  /** Smooth periodic noise around the iris: 48 random spokes, cosine-blended. */
  const spokes = Array.from({ length: 48 }, () => Math.random());
  const spoke = (a: number) => {
    const t = (((a / (Math.PI * 2)) % 1) + 1) % 1 * spokes.length;
    const i = Math.floor(t);
    const f = (1 - Math.cos((t - i) * Math.PI)) / 2;
    return spokes[i % spokes.length]! * (1 - f) + spokes[(i + 1) % spokes.length]! * f;
  };

  /**
   * Brightness of the eye at a point, 0..1 (-1 outside the lids). An almond of
   * two lid curves, a lit sclera shadowed under the upper lid, an iris of
   * spokes and rings around a black pupil, and one catchlight.
   */
  function sample(box: Box, x: number, y: number) {
    const u = (x - box.cx) / (box.w * 0.47);
    if (Math.abs(u) >= 1) return -1;
    const span = 1 - u * u;
    const top = box.cy - box.h * EYE.upper * eye.openNow * span ** 0.75;
    const bottom = box.cy + box.h * EYE.lower * eye.openNow * span ** 1.2;
    // Lash line on top, a fainter lid edge below.
    const edge = Math.max(clamp(1 - Math.abs(y - top) / 1.8, 0, 1) * 0.92, clamp(1 - Math.abs(y - bottom) / 1.2, 0, 1) * 0.48) * Math.sqrt(span);
    if (y < top || y > bottom) return edge > 0.05 ? edge : -1;
    const p = eye.pupil;
    const d = Math.hypot(x - p.x, y - p.y);
    let v: number;
    if (d < p.rp) v = 0;
    else if (d < p.ri) {
      const r = (d - p.rp) / (p.ri - p.rp);
      const a = Math.atan2(y - p.y, x - p.x) + eye.spin;
      const fibres = 0.35 + 0.65 * spoke(a + r * 0.6) * (0.75 + 0.25 * Math.cos(r * 17));
      const ruff = r < 0.12 ? 0.85 : 0.32 * Math.exp(-(((r - 0.32) / 0.09) ** 2));
      const rim = r > 0.82 ? (r - 0.82) / 0.18 : 0;
      v = Math.max(ruff, (0.22 + 0.5 * fibres * (1 - 0.4 * r)) * (1 - 0.85 * rim));
    } else {
      const lit = 1 - Math.abs(u) ** 3;
      const shade = clamp((y - top) / (box.h * 0.2), 0, 1);
      v = 0.33 * lit * (0.45 + 0.55 * shade);
    }
    if (Math.hypot(x - (p.x + p.ri * 0.3), y - (p.y - p.ri * 0.38)) < p.ri * 0.13) v = 1;
    return Math.max(v, edge);
  }

  function drawEye(box: Box, now: number) {
    const lost = worm.infection(now);
    const inner = lost > 0.01 ? worm.inner() : null;
    const ri = box.h * EYE.iris * eye.iz.value;
    eye.pupil = { x: box.cx + eye.gx.value * box.w * 0.47 * EYE.reach, y: box.cy + eye.gy.value * box.h * EYE.rise, ri, rp: ri * (0.24 + 0.26 * eye.dil.value) };
    const x0 = box.cx - box.w / 2;
    const y0 = box.cy - box.h / 2;
    const cols = Math.ceil(box.w / GW);
    const rows = Math.ceil(box.h / GH);
    if (!eye.levels || eye.levels.length !== cols * rows) eye.levels = new Int8Array(cols * rows);
    const levels = eye.levels;
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        const x = x0 + (c + 0.5) * GW;
        const y = y0 + (r + 0.5) * GH;
        let v = sample(box, x, y);
        if (inner && v >= 0 && Math.hypot(x - inner.x, y - inner.y) < 6) v = Math.max(v, 0.9);
        levels[r * cols + c] = v < 0 ? -1 : Math.round(clamp((v - TONE.floor) / TONE.range, 0, 1) ** TONE.gamma * 13);
      }
    }
    const scroll = reduced() ? 0 : Math.floor((now - eye.born) / 420);
    const tone = lost > 0.01 ? blend(colors.ink, wormRgb, lost) : colors.ink;
    const shake = lost > 0.05 && !reduced() ? [1.4 * lost * Math.sin(now / 90), 1.1 * lost * Math.cos(now / 110)] : null;
    g.font = FONT(GLYPH);
    g.textBaseline = "alphabetic";
    for (let level = 1; level <= 13; level++) {
      const strength = level / 13;
      g.fillStyle = `rgba(${tone}, ${(TONE.base + (1 - TONE.base) * strength).toFixed(3)})`;
      for (let r = 0; r < rows; r++) {
        const from = eye.offset + (r + scroll) * cols;
        let line = "";
        let any = false;
        for (let c = 0; c < cols; c++) {
          if (levels[r * cols + c] === level) {
            line += text[(from + c) % text.length];
            any = true;
          } else line += " ";
        }
        if (!any) continue;
        const y = y0 + r * GH + GLYPH * EM_TOP;
        g.fillText(line, x0, y);
        if (strength > TONE.bold) g.fillText(line, x0 + 0.45, y);
        if (shake) {
          g.globalAlpha = 0.35 * lost;
          g.fillText(line, x0 + shake[0]!, y + shake[1]!);
          g.globalAlpha = 1;
        }
      }
    }
    if (eye.openNow > 0.6) drawTrack(box, now, lost);
  }

  function drawTrack(box: Box, now: number, lost: number) {
    const p = eye.pupil;
    const alpha = clamp((eye.openNow - 0.6) / 0.3, 0, 1);
    const s = p.rp + 4;
    g.lineWidth = 0.75;
    g.font = FONT(8);
    g.strokeStyle = `rgba(${colors.ink}, ${(0.7 * alpha).toFixed(3)})`;
    g.strokeRect(Math.round(p.x - s) + 0.5, Math.round(p.y - s) + 0.5, Math.round(2 * s), Math.round(2 * s));
    const area = ((Math.PI * p.rp * p.rp) / (box.w * box.h)).toFixed(10);
    const label =
      lost > 0.6
        ? ["['pupil:u'] NaN", "NaN", area, "None"]
        : [`['pupil:u'] ${((p.x - (box.cx - box.w / 2)) / box.w).toFixed(7)}`, ((p.y - (box.cy - box.h / 2)) / box.h).toFixed(7), area, "None"];
    const lw = Math.max(...label.map((line) => g.measureText(line).width));
    const lx = clamp(box.cx - lw / 2, 8, width - lw - 8);
    const ly = box.cy + box.h / 2 + 10;
    if (!narrow() && ly + label.length * 9 < height - 8) {
      g.fillStyle = `rgba(${colors.ink}, ${(0.86 * alpha).toFixed(3)})`;
      label.forEach((line, k) => g.fillText(line, Math.round(lx), Math.round(ly) + k * 9 + 8 * EM_TOP));
      g.strokeStyle = `rgba(${colors.ink}, ${(0.22 * alpha).toFixed(3)})`;
      g.beginPath();
      g.moveTo(p.x, p.y + s);
      g.lineTo(lx + lw / 2, ly - 2);
      g.stroke();
    }
    const blind = Boolean(worm.inner());
    const targets: { x: number; y: number }[] = [];
    if (!blind && now - focus.at < FOCUS_MS) targets.push({ x: focus.x, y: focus.y });
    if (!blind && finePointer() && pointer.x >= 0 && now - pointer.at < POINTER_MS) targets.push({ x: pointer.x, y: pointer.y });
    for (const aimed of targets) {
      const t = lost > 0.01 ? { x: aimed.x + eye.lost[0] * 70 * lost, y: aimed.y + eye.lost[1] * 45 * lost } : aimed;
      const dx = t.x - p.x;
      const dy = t.y - p.y;
      const len = Math.hypot(dx, dy) || 1;
      const k = Math.min(dx ? (11 * len) / Math.abs(dx) : Infinity, dy ? (7 * len) / Math.abs(dy) : Infinity, len);
      g.lineCap = "round";
      g.setLineDash([3, 4]);
      g.lineDashOffset = reduced() ? 0 : -now / 45;
      g.strokeStyle = `rgba(${colors.accent}, ${(0.35 * alpha).toFixed(3)})`;
      g.lineWidth = 1;
      g.beginPath();
      g.moveTo(p.x, p.y);
      g.lineTo(t.x - (dx / len) * k, t.y - (dy / len) * k);
      g.stroke();
      g.setLineDash([]);
      g.lineCap = "butt";
      g.lineWidth = 0.75;
      g.strokeStyle = `rgba(${colors.ink}, ${(0.45 * alpha).toFixed(3)})`;
      g.strokeRect(Math.round(t.x - 11) + 0.5, Math.round(t.y - 7) + 0.5, 22, 14);
    }
  }

  function stepEye(box: Box | null, now: number, dt: number) {
    const lost = worm.infection(now);
    if (lost > 0.01 && now >= eye.lostAt) {
      eye.lost = [between(-1, 1), between(-1, 1)];
      eye.lostAt = now + between(160, 620);
    }
    const phone = !finePointer();
    const wanted = Boolean(box) && (!phone || now - lastTouch > PHONE_IDLE_MS || Boolean(summoned));
    if (wanted && (eye.state === "closed" || eye.state === "closing")) {
      eye.state = "opening";
      eye.lid.target = 1;
      eye.lid.response = 0.45;
    } else if (!wanted && (eye.state === "open" || eye.state === "opening")) {
      eye.state = "closing";
      eye.lid.target = 0;
      eye.lid.response = 0.3;
    }
    if (eye.state === "opening" && eye.lid.value > 0.97) eye.state = "open";
    if (eye.state === "closing" && eye.lid.value < 0.01) eye.state = "closed";
    const blind = Boolean(worm.inner());
    const hasFocus = !blind && now - focus.at < FOCUS_MS;
    const hunting = !blind && !phone && pointer.x >= 0 && now - pointer.at < POINTER_MS;
    const seen = blind || hasFocus || hunting ? null : worm.noticed(now);
    const aim: Pt | null = hasFocus ? [focus.x, focus.y] : hunting ? [pointer.x, pointer.y] : seen ? [seen.x, seen.y] : null;
    if (hasFocus && (!eye.locked || Math.hypot(focus.x - eye.locked[0], focus.y - eye.locked[1]) > 60)) eye.pulseUntil = now + IRIS.pulseMs;
    eye.locked = hasFocus ? [focus.x, focus.y] : null;
    if (box) {
      const far = aim ? Math.hypot(aim[0] - box.cx, aim[1] - box.cy) / IRIS.span : 0;
      eye.iz.target = now < eye.pulseUntil ? IRIS.pulse : hasFocus ? IRIS.locked : clamp(IRIS.near + far, IRIS.near, IRIS.far);
      eye.gx.target = aim ? clamp((aim[0] - box.cx) / 360, -1, 1) : 0.25 * Math.sin(now / 2300);
      eye.gy.target = aim ? clamp((aim[1] - box.cy) / 260, -1, 1) : 0.2 * Math.sin(now / 1700);
      if (lost > 0.01) {
        eye.gx.target += (eye.lost[0] - eye.gx.target) * lost;
        eye.gy.target += (eye.lost[1] * 0.8 - eye.gy.target) * lost;
        eye.iz.target += (IRIS.near + (IRIS.far - IRIS.near) * (0.5 + 0.5 * Math.sin(now / 170) * Math.cos(now / 430)) - eye.iz.target) * lost;
      }
    }
    eye.dil.target = hasFocus ? 0.25 : seen ? 0.12 : 0.5 + 0.2 * Math.sin(now / 1430);
    if (lost > 0.01) eye.dil.target += (0.1 + 0.8 * (0.5 + 0.5 * Math.sin(now / 240)) - eye.dil.target) * lost;
    let moving = !advance(eye.lid, dt);
    for (const s of [eye.iz, eye.gx, eye.gy, eye.dil]) if (!advance(s, dt)) moving = true;
    eye.spin += dt * (reduced() ? 0 : hasFocus ? 0.5 : 0.12);
    if (!reduced() && eye.state === "open" && now >= eye.nextBlinkAt) {
      eye.blinkAt = now;
      eye.nextBlinkAt = now + (lost > 0.3 ? between(700, 1600) : between(2600, 6400));
    }
    const blink = now - eye.blinkAt < 170 ? Math.sin(((now - eye.blinkAt) / 170) * Math.PI) : 0;
    eye.openNow = clamp(eye.lid.value, 0, 1) * (1 - 0.96 * blink);
    return moving || eye.state !== "closed";
  }

  // ------------------------------------------------------------------ ghost

  async function repair() {
    if (repairing || reduced() || document.hidden) return;
    const now = performance.now();
    if (now - externalAt < REPAIR.keys) return;
    const phone = !finePointer();
    const quiet = now - desk.lastAt >= REPAIR.idle && now - pointer.at >= REPAIR.idle && (!phone || now - lastTouch >= REPAIR.touch);
    const chars = worm.nextRepair(now, quiet);
    if (!chars) return;
    repairing = true;
    const started = performance.now();
    const alive = () => !document.hidden && externalAt < started;
    const first = chars[0]!.range.getBoundingClientRect();
    if (kb?.mouse) {
      ghost.x = first.left;
      ghost.y = first.top + first.height / 2;
      ghost.at = performance.now();
      desk.mode = "mouse";
      for (let k = 0; k < 4 && alive(); k++) {
        pointer.drift[0] += (k % 2 ? -1 : 1) * between(6, 14);
        pointer.drift[1] += between(-5, 5);
        desk.lastAt = performance.now();
        wake();
        await sleep(90);
      }
      kb.clicks[0] = performance.now() + 160;
    }
    caret = { range: chars[0]!.range, before: true };
    setFocus(first.left, first.top + first.height / 2);
    desk.lastAt = performance.now();
    wake();
    await sleep(420);
    desk.mode = "keys";
    for (const c of chars) {
      if (!alive()) break;
      pressChar(c.ch, true);
      worm.restore(c);
      flashes.push({ range: c.range, ch: c.ch, at: performance.now() });
      caret = { range: c.range, before: false };
      const r = c.range.getBoundingClientRect();
      setFocus(r.right + 2, r.top + r.height / 2);
      typedAt = performance.now();
      await sleep(between(70, 150) + (Math.random() < 0.12 ? between(200, 420) : 0));
    }
    await sleep(320);
    caret = null;
    repairing = false;
    wake();
  }

  function drawRepair(now: number) {
    flashes = flashes.filter((f) => now - f.at < 650);
    if (!flashes.length && !caret) return false;
    g.font = FONT(12);
    g.textBaseline = "alphabetic";
    g.textAlign = "left";
    for (const f of flashes) {
      const r = f.range.getBoundingClientRect();
      if (!r.width) continue;
      g.fillStyle = `rgba(${colors.accent}, ${(1 - (now - f.at) / 650).toFixed(3)})`;
      g.fillText(f.ch, r.left, r.top + 12 * 1.025);
    }
    if (caret) {
      const r = caret.range.getBoundingClientRect();
      if (r.width && (now - typedAt < 500 || Math.floor(now / 530) % 2 === 0)) {
        g.fillStyle = `rgba(${colors.accent}, 0.95)`;
        g.fillRect(Math.round(caret.before ? r.left : r.right), Math.round(r.top + (r.height - 13) / 2), 1.5, 13);
      }
    }
    return true;
  }

  // ------------------------------------------------------------------- loop

  function setFocus(x: number, y: number) {
    focus.x = x;
    focus.y = y;
    focus.at = performance.now();
    wake();
  }

  function report(now: number) {
    if (!onState) return;
    const crawler = worm.describe(now);
    const lost = worm.infection(now);
    const sight = eye.state === "closed" ? "closed" : worm.inner() || lost > 0.6 ? "NaN" : now - focus.at < FOCUS_MS ? "focused" : "tracking";
    const next = [crawler.text, crawler.hot, crawler.label, sight, repairing].join("|");
    if (next === stateKey) return;
    stateKey = next;
    onState({ worm: crawler, eye: { text: sight, hot: sight === "NaN" }, ghost: repairing ? "repairing" : "idle" });
  }

  function tick(now: number) {
    raf = 0;
    if (document.hidden) {
      last = 0;
      return;
    }
    const dt = last ? clamp((now - last) / 1000, 0, 0.1) : 1 / 60;
    last = now;
    g.clearRect(0, 0, width, height);
    const box = eyeBox();
    const eyeBusy = stepEye(box, now, dt);
    const wormBusy = worm.step(now, eyeRect(box), box);
    const redBusy = stepRed(dt, now) || Boolean(summoned && !summoned.started);
    worm.drawBody(g, now);
    const repairBusy = drawRepair(now);
    if (box && eye.openNow > 0.001) drawEye(box, now);
    worm.drawRadar(g, now, width);
    const deskBusy = drawDesk(now, dt);
    report(now);
    if (eyeBusy || deskBusy || wormBusy || repairBusy || redBusy) raf = requestAnimationFrame(tick);
    else last = 0;
  }

  function wake() {
    if (!raf && !document.hidden) raf = requestAnimationFrame(tick);
  }

  const onMove = (event: PointerEvent) => {
    if (event.pointerType !== "mouse") {
      lastTouch = performance.now();
      return;
    }
    const over = !summoned && worm.hit(event.clientX, event.clientY);
    if (over !== hovering) {
      hovering = over;
      document.documentElement.style.cursor = over ? "pointer" : "";
    }
    if (pointer.x >= 0) {
      pointer.drift[0] += (event.clientX - pointer.x) * 0.35;
      pointer.drift[1] += (event.clientY - pointer.y) * 0.35;
    }
    pointer.x = event.clientX;
    pointer.y = event.clientY;
    pointer.at = performance.now();
    desk.lastAt = pointer.at;
    desk.mode = "mouse";
    wake();
  };
  const onDown = (event: PointerEvent) => {
    const target = event.target as Element | null;
    if (!summoned && !target?.closest?.(".hc-den, .hc-lb") && worm.hit(event.clientX, event.clientY)) {
      const now = performance.now();
      summoned = { at: now, started: worm.summon(now) };
      hovering = false;
      document.documentElement.style.cursor = "";
      wake();
    }
    if (event.pointerType !== "mouse") {
      lastTouch = performance.now();
      return;
    }
    if (kb) kb.clicks[event.button === 2 ? 1 : 0] = performance.now() + 160;
    desk.lastAt = performance.now();
    desk.mode = "mouse";
    wake();
  };
  const onTouch = () => {
    lastTouch = performance.now();
    wake();
  };
  const onLeave = () => {
    pointer.at = -Infinity;
  };
  window.addEventListener("pointermove", onMove, { passive: true });
  window.addEventListener("pointerdown", onDown, { passive: true });
  window.addEventListener("touchstart", onTouch, { passive: true });
  window.addEventListener("scroll", onTouch, { passive: true, capture: true });
  document.documentElement.addEventListener("pointerleave", onLeave);
  window.addEventListener("resize", resize);
  document.addEventListener("visibilitychange", wake);
  const observer = new ResizeObserver(() => layout());
  observer.observe(deskHost);
  (navigator as Navigator & { keyboard?: { getLayoutMap?: () => Promise<Map<string, string>> } }).keyboard
    ?.getLayoutMap?.()
    .then((map) => {
      layoutMap = map;
      layout();
    })
    .catch(() => {});
  recolor();
  resize();
  const idle = window.setInterval(wake, 1500);
  const repairs = window.setInterval(repair, REPAIR.every);

  return {
    pressKey,
    pressChar,
    focus: setFocus,
    recolor,
    setText(value: string) {
      worm.reset();
      const next = String(value || "").replace(/\s+/g, " ").replace(/[^\x21-\x7e ]/g, "").trim();
      if (!next || next === text) return;
      text = next;
      eye.offset = Math.floor(Math.random() * text.length);
      if (eye.state === "open" || eye.state === "opening") {
        eye.blinkAt = performance.now();
        eye.nextBlinkAt = eye.blinkAt + between(2600, 6400);
      }
      wake();
    },
    setWorm(on: boolean) {
      const now = performance.now();
      if (on) worm.wake(now);
      else worm.sleep(now);
      wake();
    },
    destroy() {
      cancelAnimationFrame(raf);
      clearInterval(idle);
      clearInterval(repairs);
      observer.disconnect();
      worm.destroy();
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerdown", onDown);
      window.removeEventListener("touchstart", onTouch);
      window.removeEventListener("scroll", onTouch, { capture: true });
      document.documentElement.removeEventListener("pointerleave", onLeave);
      window.removeEventListener("resize", resize);
      document.removeEventListener("visibilitychange", wake);
      document.documentElement.style.cursor = "";
    },
  };
}

export type Watch = ReturnType<typeof createWatch>;
