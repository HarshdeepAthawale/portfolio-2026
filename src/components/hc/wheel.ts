import type { Day, Icon, Tile } from "@/lib/editor/types";
import { palettes } from "@/config/palettes";
import { buildInk, inkPaths, paintInk, type InkModel } from "./ink";
import { FONT, MARK, TAU, clamp, make, readColors, reduced, rng, type Colors } from "./util";

/**
 * The project wheel: cards ride the left edge of a big circle, the selected
 * one at its apex. Beside it an "ink spine" is drawn from a year of
 * contributions: a brush stroke that swells on busy days, breaks on quiet
 * stretches and splatters at the peaks.
 */

const GEOM = { radius: 520, step: 0.155, reach: 0.82, card: [150, 94] as const, small: 0.64, tilt: 0.55, rim: 96, pad: 150, dragPx: 64, response: 0.34 };
const INK = { formMs: 2800, swayMs: 1400, tail: 1.12 };

export type WheelItem = { id: string; label: string; src?: string; tile?: Tile };

/** Painted tiles for entries without a screenshot. */
export function paintTile(kind: Tile, colors: Colors, icons: Icon[]) {
  const [w, h] = GEOM.card;
  const canvas = document.createElement("canvas");
  canvas.width = w * 2;
  canvas.height = h * 2;
  const g = canvas.getContext("2d")!;
  g.scale(2, 2);
  g.fillStyle = colors.paper;
  g.fillRect(0, 0, w, h);
  const ink = (a: number) => `rgba(${colors.ink}, ${a})`;
  if (kind === "about") {
    g.strokeStyle = ink(0.14);
    g.lineWidth = 0.6;
    for (let y = 8; y < h - 6; y += 4) {
      g.beginPath();
      g.moveTo(8, y);
      g.lineTo(w - 8, y);
      g.stroke();
    }
    const s = 0.62;
    g.save();
    g.translate((w - 88 * s) / 2, 12);
    g.scale(s, s);
    g.fillStyle = ink(0.92);
    for (const d of MARK) g.fill(new Path2D(d), "evenodd");
    g.restore();
  } else if (kind === "stack") {
    const size = 13;
    const gap = 9;
    const cols = 6;
    const x0 = (w - (cols * size + (cols - 1) * gap)) / 2;
    icons.slice(0, 18).forEach((icon, k) => {
      g.save();
      g.translate(x0 + (k % cols) * (size + gap), 10 + Math.floor(k / cols) * (size + gap));
      g.scale(size / (icon.box || 24), size / (icon.box || 24));
      g.fillStyle = ink(k < 6 ? 0.95 : 0.7);
      g.fill(new Path2D(icon.path));
      g.restore();
    });
  } else if (kind === "themes") {
    const sw = w / palettes.length;
    palettes.forEach((p, k) => {
      g.fillStyle = p.bg;
      g.fillRect(k * sw, 0, Math.ceil(sw), h);
      g.fillStyle = p.accent;
      g.fillRect(k * sw, h * 0.62, Math.ceil(sw), h * 0.16);
      g.fillStyle = p.ink;
      g.fillRect(k * sw + sw * 0.3, h * 0.3, Math.max(1, sw * 0.4), 2);
    });
  } else if (kind === "findings") {
    // One bar per finding, CVSS-ish heights, the critical one in red.
    const bars = [9.1, 8.6, 7.5, 7.1, 6.8, 6.5, 5.3, 4.3];
    const bw = 9;
    const x0 = (w - bars.length * (bw + 5)) / 2;
    bars.forEach((v, k) => {
      const bh = (v / 10) * (h - 34);
      g.fillStyle = k === 0 ? `rgba(${colors.red}, 0.95)` : ink(0.25 + 0.06 * (bars.length - k));
      g.fillRect(x0 + k * (bw + 5), h - 22 - bh, bw, bh);
    });
    g.font = FONT(9);
    g.fillStyle = ink(0.7);
    g.fillText("9.1", x0, 14);
  } else {
    // writing / career / honors: ruled text, a few lines long.
    g.fillStyle = ink(0.55);
    const rand = rng(kind.length * 97);
    for (let y = 12; y < h - 22; y += 7) {
      const len = 40 + rand() * (w - 60);
      g.fillRect(10, y, len, 2);
    }
    g.fillStyle = `rgba(${colors.accent}, 0.9)`;
    g.fillRect(10, 12, 26, 2);
  }
  return canvas.toDataURL("image/png");
}

type WheelOptions = {
  items: WheelItem[];
  days: Day[];
  icons: Icon[];
  root: HTMLElement;
  initial?: number;
  onChange?: (item: WheelItem, k: number) => void;
  onCommit?: (item: WheelItem, k: number) => void;
  onPick?: (item: WheelItem, k: number) => void;
};

export function createWheel(host: HTMLElement, { items, days, icons, root, initial = 0, onChange, onCommit, onPick }: WheelOptions) {
  const n = items.length;
  const layer = make("canvas", "hc-wheel-ink");
  layer.setAttribute("aria-hidden", "true");
  const cache = document.createElement("canvas");
  const list = make("ul", "hc-wheel-list");
  list.setAttribute("role", "listbox");
  list.setAttribute("aria-label", host.getAttribute("aria-label") || "Entries");
  const mark = make("span", "hc-wheel-mark");
  mark.setAttribute("aria-hidden", "true");
  const hint = make("p", "hc-wheel-hint", "scroll · drag the wheel");
  hint.setAttribute("aria-hidden", "true");
  const cards = items.map((item, k) => {
    const li = make("li");
    li.setAttribute("role", "none");
    const button = make("button", "hc-card");
    button.type = "button";
    button.dataset.index = String(k);
    button.setAttribute("role", "option");
    button.setAttribute("aria-label", item.label);
    button.tabIndex = -1;
    const img = make("img");
    img.alt = "";
    img.decoding = "async";
    img.draggable = false;
    if (item.src) img.src = item.src;
    const cap = make("span", "hc-card-cap", item.label);
    cap.setAttribute("aria-hidden", "true");
    button.append(img, cap);
    li.append(button);
    list.append(li);
    return { button, img };
  });
  host.replaceChildren(layer, list, mark, hint);

  let W = 0;
  let H = 0;
  let cx = 0;
  let cy = 0;
  let apex = 0;
  let pos = initial;
  let target = initial;
  let vel = 0;
  let raf = 0;
  let last = 0;
  let colors: Colors | null = null;
  let committed = -1;
  let commitTimer = 0;
  let drag: { id: number; y: number; from: number; v: number; lastY: number; lastAt: number } | null = null;
  let moved = false;
  let wheelAcc = 0;
  let live = true;
  let foot: { x: number; y: number } | null = null;
  let model: InkModel | null = null;
  let full: ReturnType<typeof inkPaths> | null = null;
  let anim: { kind: "form" | "sway"; dir: number; start: number } | null = null;
  let inkRaf = 0;
  let wantForm = false;
  let formed = reduced();

  const wrap = (k: number) => ((Math.round(k) % n) + n) % n;
  const index = () => wrap(target);
  const offOf = (k: number, p: number) => {
    let off = (k - p) % n;
    if (off > n / 2) off -= n;
    if (off < -n / 2) off += n;
    return off;
  };

  function recolorNow() {
    colors = readColors(root);
    items.forEach((item, k) => {
      if (item.tile && !item.src) cards[k]!.img.src = paintTile(item.tile, colors!, icons);
    });
  }

  function sized(canvas: HTMLCanvasElement) {
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const cw = W + GEOM.pad;
    const w = Math.round(cw * dpr);
    const h = Math.round(H * dpr);
    if (canvas.width !== w || canvas.height !== h) {
      canvas.width = w;
      canvas.height = h;
    }
    const g = canvas.getContext("2d")!;
    g.setTransform(dpr, 0, 0, dpr, GEOM.pad * dpr, 0);
    g.clearRect(-GEOM.pad, 0, cw, H);
    return g;
  }

  function rebuild() {
    const R = GEOM.radius + GEOM.rim;
    const half = Math.asin(clamp((H / 2 - 30) / R, 0.1, 0.9));
    model = buildInk(cx, cy, R, Math.PI + half, Math.PI - half, days.map((d) => d.count));
    full = inkPaths(model);
  }

  function frameInk(g: CanvasRenderingContext2D) {
    if (!colors) return;
    g.strokeStyle = `rgba(${colors.dim}, 0.3)`;
    g.lineWidth = 1;
    g.beginPath();
    g.arc(cx, cy, GEOM.radius, Math.PI - 1.2, Math.PI + 1.2);
    g.stroke();
    if (!days.length || !foot) return;
    const text = days[days.length - 1]!.date;
    g.save();
    g.font = FONT(9);
    g.lineJoin = "round";
    g.lineWidth = 3;
    g.strokeStyle = colors.paper;
    g.strokeText(text, foot.x, foot.y);
    g.fillStyle = `rgba(${colors.dim}, 0.9)`;
    g.fillText(text, foot.x, foot.y);
    g.restore();
  }

  function blit(g: CanvasRenderingContext2D) {
    g.save();
    g.setTransform(1, 0, 0, 1, 0, 0);
    g.drawImage(cache, 0, 0);
    g.restore();
  }

  function drawInk() {
    layer.style.width = `${W + GEOM.pad}px`;
    layer.style.height = `${H}px`;
    if (!colors || !W || !H || !model || !full) {
      sized(layer);
      return;
    }
    const g = sized(cache);
    paintInk(g, full, colors.ink);
    frameInk(g);
    if (!anim) blit(sized(layer));
  }

  function swayAt(a: number, p: number, dir: number) {
    if (!model) return 0;
    const d = Math.abs(a - Math.PI) / Math.max(0.001, Math.abs(model.a1 - model.a0) / 2);
    const front = clamp(p * 1.6 - d, 0, 1);
    return dir * 0.3 * Math.sin(front * Math.PI * 2.5) * (1 - front) * (1 - p);
  }

  function animate(kind: "form" | "sway", dir = 1) {
    if (reduced() || !model || !W) return;
    anim = { kind, dir, start: performance.now() };
    if (!inkRaf && live) inkRaf = requestAnimationFrame(tickInk);
  }

  function tickInk(now: number) {
    inkRaf = 0;
    if (!anim || !model || !W || !colors) return;
    const g = sized(layer);
    const m = model;
    if (anim.kind === "form") {
      const p = (now - anim.start) / INK.formMs;
      const head = p * m.n;
      frameInk(g);
      paintInk(g, inkPaths(m, (day, delay) => (head - day) / 16 - delay, (t) => t * m.n <= head), colors.ink);
      if (p < 1) {
        const a = m.a0 + p * (m.a1 - m.a0);
        g.fillStyle = `rgba(${colors.accent}, 0.95)`;
        g.beginPath();
        g.arc(cx + Math.cos(a) * m.R, cy + Math.sin(a) * m.R, 2.4, 0, TAU);
        g.fill();
      }
      if (p >= INK.tail) {
        anim = null;
        formed = true;
        blit(sized(layer));
        return;
      }
    } else {
      const p = Math.min(1, (now - anim.start) / INK.swayMs);
      const dir = anim.dir;
      frameInk(g);
      paintInk(g, inkPaths(m, undefined, undefined, (a) => swayAt(a, p, dir)), colors.ink);
      if (p >= 1) {
        anim = null;
        blit(sized(layer));
        return;
      }
    }
    inkRaf = requestAnimationFrame(tickInk);
  }

  function place() {
    if (!W) return;
    const [bw, bh] = GEOM.card;
    const sel = index();
    for (let k = 0; k < n; k++) {
      const off = offOf(k, pos);
      const a = Math.PI - off * GEOM.step;
      const far = Math.abs(off * GEOM.step);
      const { button } = cards[k]!;
      if (far > GEOM.reach) {
        button.style.visibility = "hidden";
        continue;
      }
      const x = cx + Math.cos(a) * GEOM.radius;
      const y = cy + Math.sin(a) * GEOM.radius;
      const near = clamp(1 - Math.abs(off), 0, 1);
      const s = GEOM.small + (1 - GEOM.small) * near;
      button.style.visibility = "visible";
      button.style.transform = `translate(${Math.round(x - bw / 2)}px, ${Math.round(y - bh / 2)}px) rotate(${((a - Math.PI) * GEOM.tilt).toFixed(4)}rad) scale(${s.toFixed(4)})`;
      button.style.setProperty("--shade", (k === sel ? 0 : 1 - (0.32 + 0.42 * (1 - far / GEOM.reach) + 0.26 * near)).toFixed(3));
      button.style.zIndex = String(100 - Math.round(Math.abs(off) * 8));
    }
    mark.style.transform = `translate(${(apex + bw / 2 + 4).toFixed(1)}px, ${(cy - 6).toFixed(1)}px)`;
  }

  function layout() {
    const rect = host.getBoundingClientRect();
    if (!rect.width || !rect.height) return false;
    const grew = rect.width !== W || rect.height !== H || !model;
    W = rect.width;
    H = rect.height;
    apex = clamp(W * 0.34, 78, 130);
    cx = apex + GEOM.radius;
    cy = H / 2;
    foot = { x: parseFloat(getComputedStyle(hint).left) || 0, y: hint.offsetTop - 9 };
    if (grew) rebuild();
    drawInk();
    place();
    if (wantForm && !formed && !anim) animate("form");
    return true;
  }

  function frame(now: number) {
    raf = 0;
    const dt = last ? Math.min(0.05, (now - last) / 1000) : 1 / 60;
    last = now;
    if (!drag) {
      const w = TAU / GEOM.response;
      vel += (w * w * (target - pos) - 2 * w * vel) * dt;
      pos += vel * dt;
      if (Math.abs(target - pos) < 0.002 && Math.abs(vel) < 0.01) {
        pos = target;
        vel = 0;
      }
    }
    place();
    if (drag || pos !== target) raf = requestAnimationFrame(frame);
    else last = 0;
  }

  function kick() {
    if (reduced() && !drag) {
      pos = target;
      vel = 0;
      place();
      return;
    }
    if (!raf && live) raf = requestAnimationFrame(frame);
  }

  function changed() {
    const k = index();
    cards.forEach(({ button }, j) => {
      button.setAttribute("aria-selected", String(j === k));
      button.tabIndex = j === k ? 0 : -1;
    });
    onChange?.(items[k]!, k);
    clearTimeout(commitTimer);
    commitTimer = window.setTimeout(commit, reduced() ? 0 : 170);
  }

  function commit() {
    const k = index();
    if (k === committed) return;
    const previous = committed;
    committed = k;
    if (formed && (!anim || anim.kind === "sway")) animate("sway", k > previous ? 1 : -1);
    onCommit?.(items[k]!, k);
  }

  function step(delta: number) {
    const next = Math.round(target) + delta;
    if (next === target) return;
    target = next;
    changed();
    kick();
  }

  function select(k: number) {
    const next = Math.round(target) + offOf(k, Math.round(target));
    if (next === target) return;
    target = next;
    changed();
    kick();
  }

  const onWheel = (event: WheelEvent) => {
    event.preventDefault();
    const unit = event.deltaMode === 1 ? 40 : event.deltaMode === 2 ? 400 : 1;
    wheelAcc += (Math.abs(event.deltaY) >= Math.abs(event.deltaX) ? event.deltaY : event.deltaX) * unit;
    const steps = Math.trunc(wheelAcc / 42);
    if (!steps) return;
    wheelAcc -= steps * 42;
    step(clamp(steps, -3, 3));
  };
  const onDown = (event: PointerEvent) => {
    if (event.button !== 0) return;
    const now = performance.now();
    drag = { id: event.pointerId, y: event.clientY, from: pos, v: 0, lastY: event.clientY, lastAt: now };
    moved = false;
  };
  const onMove = (event: PointerEvent) => {
    if (!drag || event.pointerId !== drag.id) return;
    const dy = event.clientY - drag.y;
    if (!moved && Math.abs(dy) < 6) return;
    if (!moved) {
      moved = true;
      host.setPointerCapture?.(event.pointerId);
      host.classList.add("is-dragging");
    }
    const now = performance.now();
    const dt = Math.max(1, now - drag.lastAt);
    drag.v = 0.7 * drag.v + 0.3 * ((event.clientY - drag.lastY) / dt) * 1000;
    drag.lastY = event.clientY;
    drag.lastAt = now;
    pos = drag.from - dy / GEOM.dragPx;
    vel = 0;
    const near = Math.round(pos);
    if (near !== target) {
      target = near;
      changed();
    }
    kick();
  };
  const onUp = (event: PointerEvent) => {
    if (!drag || event.pointerId !== drag.id) return;
    const release = drag.v;
    drag = null;
    host.classList.remove("is-dragging");
    if (!moved) return;
    // Where a 0.99-per-frame decay of the release speed would come to rest.
    const glide = ((release / 1000) * 0.99) / 0.01;
    const next = Math.round(pos - glide / GEOM.dragPx);
    vel = -release / GEOM.dragPx;
    if (next !== target) {
      target = next;
      changed();
    }
    kick();
  };
  const onClick = (event: MouseEvent) => {
    const button = (event.target as Element).closest?.(".hc-card") as HTMLElement | null;
    if (!button) return;
    if (moved) {
      event.preventDefault();
      moved = false;
      return;
    }
    select(Number(button.dataset.index));
    onPick?.(items[index()]!, index());
  };

  host.addEventListener("wheel", onWheel, { passive: false });
  host.addEventListener("pointerdown", onDown);
  host.addEventListener("pointermove", onMove);
  host.addEventListener("pointerup", onUp);
  host.addEventListener("pointercancel", onUp);
  host.addEventListener("click", onClick);
  const observer = new ResizeObserver(() => layout());
  observer.observe(host);

  recolorNow();
  layout();
  changed();
  clearTimeout(commitTimer);
  document.fonts?.ready.then(() => {
    if (!live) return;
    recolorNow();
    drawInk();
  });

  return {
    step,
    select,
    current: () => ({ item: items[index()]!, index: index() }),
    centerOf(k = index()) {
      const rect = cards[k]?.button.getBoundingClientRect();
      return rect && rect.width ? { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 } : null;
    },
    focus() {
      cards[index()]?.button.focus({ preventScroll: true });
    },
    commitNow() {
      clearTimeout(commitTimer);
      commit();
    },
    layout,
    form() {
      wantForm = true;
      if (!formed && !anim && W) animate("form");
    },
    recolor() {
      recolorNow();
      drawInk();
    },
    destroy() {
      live = false;
      cancelAnimationFrame(raf);
      cancelAnimationFrame(inkRaf);
      clearTimeout(commitTimer);
      observer.disconnect();
      host.removeEventListener("wheel", onWheel);
      host.removeEventListener("pointerdown", onDown);
      host.removeEventListener("pointermove", onMove);
      host.removeEventListener("pointerup", onUp);
      host.removeEventListener("pointercancel", onUp);
      host.removeEventListener("click", onClick);
    },
  };
}

export type Wheel = ReturnType<typeof createWheel>;
