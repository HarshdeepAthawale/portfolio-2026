import type { ArchiveCard } from "@/lib/editor/types";
import { getPalette } from "@/config/palettes";
import type { Lightbox } from "./lightbox";
import { zoomButton } from "./lightbox";
import { make } from "./util";

/**
 * `git log --graph` as a card grid: cards grouped by month (or by a label),
 * newest first, hung off a thin wire that runs down the left like a commit
 * graph. The box scrolls on its own and fades at the edges.
 */

const SVG = "http://www.w3.org/2000/svg";
const FADE = 48;
const BUS = 12;
const SPINE = 9;

/** A tiny editor screenshot in a palette's colours. */
function paintTheme(name: string) {
  const p = getPalette(name);
  const w = 320;
  const h = 180;
  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const g = canvas.getContext("2d")!;
  g.fillStyle = p.bg;
  g.fillRect(0, 0, w, h);
  g.fillStyle = p.line;
  g.fillRect(0, 52, w, 11);
  const tones = [p.kw, p.fn, p.str, p.ty, p.num, p.ink, p.dim];
  let seed = [...name].reduce((sum, ch) => sum * 31 + ch.charCodeAt(0), 7) >>> 0;
  const rand = () => {
    seed = (seed * 1664525 + 1013904223) >>> 0;
    return seed / 4294967296;
  };
  for (let row = 0; row < 13; row++) {
    const y = 12 + row * 11.5;
    g.fillStyle = p.dim;
    g.globalAlpha = 0.5;
    g.fillRect(8, y, 8, 3);
    g.globalAlpha = 1;
    let x = 24 + (row % 4 === 0 ? 0 : 12 * Math.floor(rand() * 3));
    const words = 1 + Math.floor(rand() * 5);
    for (let k = 0; k < words && x < w - 20; k++) {
      const len = 10 + rand() * 46;
      g.fillStyle = tones[Math.floor(rand() * tones.length)]!;
      g.fillRect(x, y, len, 3);
      x += len + 6;
    }
  }
  g.fillStyle = p.accent;
  g.fillRect(0, h - 11, 46, 11);
  g.fillStyle = p.line;
  g.fillRect(46, h - 11, w - 46, 11);
  return canvas;
}

type Options = {
  kind: "themes" | "cards";
  cards: ArchiveCard[];
  viewport: HTMLElement;
  lightbox: Lightbox;
  current?: string;
  groupBy?: "month" | "group";
  onPick?: (card: ArchiveCard) => void;
};

export function createArchive(host: HTMLElement, { kind, cards, viewport, lightbox, current, groupBy = "month", onPick }: Options) {
  const box = make("div", "hc-arc");
  const inner = make("div", "arc-inner");
  const wire = document.createElementNS(SVG, "svg");
  wire.setAttribute("class", "arc-wire");
  wire.setAttribute("aria-hidden", "true");
  inner.append(wire);
  box.append(inner);
  host.replaceChildren(box);

  const sorted = groupBy === "month" ? [...cards].sort((a, b) => b.date.localeCompare(a.date) || a.name.localeCompare(b.name)) : cards;
  const groups: { key: string; items: ArchiveCard[] }[] = [];
  for (const card of sorted) {
    const key = groupBy === "month" ? card.date.slice(0, 7) : card.date;
    const group = groups.find((g) => g.key === key);
    if (group) group.items.push(card);
    else groups.push({ key, items: [card] });
  }

  const nodes: { li: HTMLElement; button: HTMLElement; card: ArchiveCard; img: HTMLImageElement | null; lens: HTMLButtonElement | null }[] = [];
  for (const group of groups) {
    const section = make("section", "arc-grp");
    section.setAttribute("aria-label", `${group.key}, ${group.items.length}`);
    const label = make("h6", "arc-mon", group.key);
    label.append(make("span", "arc-count", ` · ${group.items.length}`));
    const list = make("ul", "arc-grid");
    for (const card of group.items) {
      const li = make("li");
      const button: HTMLElement = card.href ? make("a", "arc-card") : make("button", "arc-card");
      if (button instanceof HTMLAnchorElement) button.href = card.href!;
      else (button as HTMLButtonElement).type = "button";
      button.setAttribute("aria-label", [card.name, card.meta, card.note].filter(Boolean).join(". "));
      let img: HTMLImageElement | null = null;
      if (card.palette) button.append(paintTheme(card.palette));
      else {
        img = make("img");
        img.src = card.thumb ?? "";
        img.alt = "";
        img.loading = "lazy";
        img.decoding = "async";
        button.append(img);
      }
      const meta = make("span", "arc-meta");
      meta.append(make("span", "arc-name", card.name));
      if (card.meta || card.badge) {
        const side = make("span", "arc-stars", card.meta ?? "");
        if (card.badge) side.append(make("b", undefined, card.badge));
        meta.append(side);
      }
      button.append(meta);
      if (card.palette) {
        const p = getPalette(card.palette);
        const sw = make("span", "arc-sw");
        for (const color of [p.bg, p.line, p.dim, p.ink, p.accent, p.kw, p.str, p.fn, p.ty, p.num, p.red]) {
          const chip = make("i");
          chip.style.background = color;
          sw.append(chip);
        }
        button.append(sw);
      } else if (card.note) button.append(make("span", "arc-note", card.note));
      li.append(button);
      const lens = img ? zoomButton("arc-zoom") : null;
      if (lens) li.append(lens);
      list.append(li);
      nodes.push({ li, button, card, img, lens });
    }
    section.append(label, list);
    inner.append(section);
  }

  let selected = nodes.findIndex((n) => n.card.id === current);
  const mark = () =>
    nodes.forEach((n, k) => {
      n.button.classList.toggle("is-on", k === selected);
      if (kind === "themes") n.button.setAttribute("aria-pressed", String(k === selected));
    });

  function rectOf(el: Element) {
    const base = inner.getBoundingClientRect();
    const rect = el.getBoundingClientRect();
    return { x: rect.left - base.left + rect.width / 2, top: rect.top - base.top, bottom: rect.bottom - base.top };
  }

  /** Draw the graph: a spine, a bus above each group, drops into each card. */
  function route() {
    const parts: string[] = [];
    const line = (x1: number, y1: number, x2: number, y2: number) => parts.push(`<line x1="${x1.toFixed(1)}" y1="${y1.toFixed(1)}" x2="${x2.toFixed(1)}" y2="${y2.toFixed(1)}"/>`);
    const knots: number[] = [];
    for (const section of inner.querySelectorAll(".arc-grp")) {
      const boxes = [...section.querySelectorAll(".arc-card")].map(rectOf);
      if (!boxes.length) continue;
      const rows: (typeof boxes)[] = [];
      for (const b of boxes) {
        const row = rows.find((items) => Math.abs(items[0]!.top - b.top) < 2);
        if (row) row.push(b);
        else rows.push([b]);
      }
      const bus = rows[0]![0]!.top - BUS;
      knots.push(bus);
      line(SPINE, bus, Math.max(...rows[0]!.map((b) => b.x)), bus);
      for (const b of rows[0]!) line(b.x, bus, b.x, b.top);
      rows.forEach((row, r) => {
        const next = rows[r + 1];
        if (!next) return;
        for (const b of row) {
          const below = next.find((n) => Math.abs(n.x - b.x) < 2);
          if (below) line(b.x, b.bottom, b.x, below.top);
        }
      });
    }
    if (knots.length) line(SPINE, 0, SPINE, knots[knots.length - 1]!);
    parts.push(`<path class="arc-tip" d="M${SPINE - 4} 6L${SPINE} 0L${SPINE + 4} 6"/>`);
    for (const y of knots) parts.push(`<rect x="${SPINE - 3}" y="${(y - 3).toFixed(1)}" width="6" height="6"/>`);
    const width = inner.clientWidth;
    const height = inner.scrollHeight;
    wire.setAttribute("viewBox", `0 0 ${width} ${height}`);
    wire.setAttribute("width", String(width));
    wire.setAttribute("height", String(height));
    wire.innerHTML = parts.join("");
  }

  function fade() {
    box.style.setProperty("--fade-top", `${Math.max(0, Math.min(FADE, box.scrollTop))}px`);
    box.style.setProperty("--fade-bottom", `${Math.max(0, Math.min(FADE, box.scrollHeight - box.clientHeight - box.scrollTop))}px`);
  }

  function size() {
    const cell = parseFloat(getComputedStyle(viewport).getPropertyValue("--cell-h")) || 13;
    const top = box.getBoundingClientRect().top - viewport.getBoundingClientRect().top + viewport.scrollTop;
    box.style.height = `${Math.max(220, Math.floor(viewport.clientHeight - top - 3 * cell - 2))}px`;
    route();
    fade();
  }

  function reveal(k: number) {
    const { top, bottom } = rectOf(nodes[k]!.li);
    if (top < box.scrollTop + FADE) box.scrollTop = Math.max(0, top - FADE);
    else if (bottom > box.scrollTop + box.clientHeight - FADE) box.scrollTop = bottom - box.clientHeight + FADE;
  }

  function focusAt(k: number) {
    const next = Math.max(0, Math.min(nodes.length - 1, k));
    nodes[next]!.button.focus({ preventScroll: true });
    reveal(next);
  }

  function vertical(k: number, down: boolean) {
    const from = rectOf(nodes[k]!.button);
    let best = k;
    let score = Infinity;
    nodes.forEach((n, j) => {
      if (j === k) return;
      const to = rectOf(n.button);
      const dy = down ? to.top - from.bottom : from.top - to.bottom;
      if (dy < -1) return;
      const cost = dy * 4 + Math.abs(to.x - from.x);
      if (cost < score) {
        score = cost;
        best = j;
      }
    });
    return best;
  }

  nodes.forEach((n, k) => {
    n.button.addEventListener("click", (event) => {
      if (kind === "themes") event.preventDefault();
      selected = k;
      mark();
      onPick?.(n.card);
    });
    n.button.addEventListener("keydown", (event) => {
      let next: number | null = null;
      if (event.key === "ArrowRight" || event.key === "l") next = k + 1;
      else if (event.key === "ArrowLeft" || event.key === "h") next = k - 1;
      else if (event.key === "ArrowDown" || event.key === "j") next = vertical(k, true);
      else if (event.key === "ArrowUp" || event.key === "k") next = vertical(k, false);
      else if (event.key === "Home") next = 0;
      else if (event.key === "End") next = nodes.length - 1;
      if (next === null) return;
      event.preventDefault();
      event.stopPropagation();
      focusAt(next);
    });
  });

  const zoomable = nodes.filter((n) => n.lens);
  const visibleRect = (n: (typeof nodes)[number]) => {
    const rect = n.img!.getBoundingClientRect();
    const view = box.getBoundingClientRect();
    return rect.top >= view.top - 1 && rect.bottom <= view.bottom + 1 ? rect : null;
  };
  zoomable.forEach((n, k) => {
    n.lens!.addEventListener("click", (event) => {
      event.stopPropagation();
      lightbox.open({
        items: zoomable.map((item, j) => ({
          src: item.card.thumb!,
          alt: item.card.name,
          left: [[`${item.card.name} · `], [item.card.meta ?? "", "b"], [` · ${j + 1}/${zoomable.length}`]],
          right: [matchMedia("(pointer: fine)").matches ? "←→ · esc" : "swipe · tap closes"],
        })),
        index: k,
        from: (j) => visibleRect(zoomable[j]!),
        onStep: (j) => reveal(nodes.indexOf(zoomable[j]!)),
      });
    });
  });

  let frame = 0;
  const onScroll = () => {
    if (frame) return;
    frame = requestAnimationFrame(() => {
      frame = 0;
      fade();
    });
  };
  box.addEventListener("scroll", onScroll, { passive: true });
  const observer = new ResizeObserver(() => size());
  observer.observe(viewport);
  observer.observe(inner);
  size();
  mark();
  if (selected >= 0) reveal(selected);

  return {
    focus() {
      focusAt(Math.max(0, selected));
    },
    select(id: string) {
      selected = nodes.findIndex((n) => n.card.id === id);
      mark();
    },
    destroy() {
      observer.disconnect();
      box.removeEventListener("scroll", onScroll);
      cancelAnimationFrame(frame);
    },
  };
}
