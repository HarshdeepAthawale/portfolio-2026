import type { Block, Day, Icon, Out, Seg, Shot, Spec } from "@/lib/editor/types";
import { between, make, reduced, sleep } from "./util";
import type { Lightbox } from "./lightbox";
import { zoomButton } from "./lightbox";

/**
 * Plays a session into the buffer: a prompt, the command typed key by key,
 * then its output a line at a time. Calendars type `renderMonth(...)` calls and
 * light their days; `ls shots/` mounts a crossfading screenshot viewer.
 */

const PACE = { key: [18, 34] as [number, number], enter: 170, line: 14, gap: 260 };
const RUN = { every: 3800, hold: 8000 };
const CAL = { key: [18, 18] as [number, number], day: 28, month: 350 };
const WEEKDAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
const GAUGE_MAX = 16;
const SVG = "http://www.w3.org/2000/svg";

export type Watcher = {
  pressChar(ch: string): void;
  pressKey(code: string, shift?: boolean): void;
  focus(x: number, y: number): void;
};

type Options = {
  user: string;
  host: string;
  lightbox: Lightbox;
  watch: () => Watcher | null;
  onTyping?: (on: boolean) => void;
  mountHero?: (host: HTMLElement) => { destroy(): void; recolor?(): void } | null;
  mountArchive?: (host: HTMLElement, block: NonNullable<Block["archive"]>) => () => void;
};

function glyph(icon: Icon | null, letter: string) {
  if (!icon?.path) return make("span", "t-glyph", (letter || "?").slice(0, 1));
  const svg = document.createElementNS(SVG, "svg");
  svg.setAttribute("viewBox", `0 0 ${icon.box || 24} ${icon.box || 24}`);
  svg.setAttribute("class", "t-icon");
  svg.setAttribute("aria-hidden", "true");
  if (icon.title) svg.dataset.tip = icon.title;
  const path = document.createElementNS(SVG, "path");
  path.setAttribute("d", icon.path);
  svg.append(path);
  return svg;
}

export function createTerminal(buffer: HTMLElement, options: Options) {
  let token = 0;
  let viewer: Viewer | null = null;
  let hero: { destroy(): void; recolor?(): void } | null = null;
  let mounts: (() => void)[] = [];

  /** How many gauge cells fit after `used` characters on a line. */
  function room(used: number) {
    const style = getComputedStyle(buffer);
    const cell = parseFloat(style.getPropertyValue("--cell-w")) || 7.2;
    const chars = Math.floor((buffer.clientWidth - parseFloat(style.paddingLeft) - parseFloat(style.paddingRight) - 1) / cell) - 3;
    return Math.max(6, Math.min(GAUGE_MAX, chars - used));
  }
  const filledOf = (share: number, cells: number) => (share > 0 ? Math.max(1, Math.min(cells, Math.round(share * cells))) : 0);

  function fill(parent: Element, segs: Seg[]) {
    for (const seg of segs) {
      if (typeof seg === "string") {
        parent.append(seg);
      } else if (Array.isArray(seg)) {
        const [text, cls, href] = seg;
        if (href) {
          const link = make("a", `md-link${cls ? ` ${cls}` : ""}`, text);
          link.href = href;
          if (/^https?:/.test(href)) {
            link.target = "_blank";
            link.rel = "noopener";
          }
          parent.append(link);
        } else parent.append(make("span", cls, text));
      } else if ("gauge" in seg) {
        const cells = room(seg.used);
        const filled = filledOf(seg.gauge, cells);
        const on = make("span", "t-gauge", "█".repeat(filled));
        on.dataset.share = String(seg.gauge);
        on.dataset.used = String(seg.used);
        parent.append(on, make("span", "t-gauge-off", "░".repeat(cells - filled)));
      } else {
        parent.append(glyph(seg.icon, seg.letter));
      }
    }
  }

  function row(segs: Seg[], cls = "") {
    const line = make("div", `ln${cls ? ` ${cls}` : ""}`);
    const tx = make("span", "tx");
    fill(tx, segs);
    line.append(tx);
    return line;
  }

  const prompt = (cwd: string, branch: string | null): Seg[] => [
    [options.user, "t-user"],
    [`@${options.host}`, "t-host"],
    " ",
    [cwd, "t-path"],
    ...(branch ? [" ", [`(${branch})`, "t-git"] as Seg] : []),
  ];

  /** Re-size gauges when the buffer width changes. */
  function refit() {
    for (const bar of buffer.querySelectorAll<HTMLElement>(".t-gauge[data-used]")) {
      const off = bar.nextElementSibling;
      const cells = room(Number(bar.dataset.used));
      if (!off || (bar.textContent?.length ?? 0) + (off.textContent?.length ?? 0) === cells) continue;
      const filled = filledOf(Number(bar.dataset.share), cells);
      bar.textContent = "█".repeat(filled);
      off.textContent = "░".repeat(cells - filled);
    }
  }

  async function type(target: Element, text: string, mine: number, pace = PACE.key) {
    const watch = options.watch();
    for (let n = 1; n <= text.length; n++) {
      if (mine !== token) return false;
      target.textContent = text.slice(0, n);
      watch?.pressChar(text[n - 1]!);
      const rect = target.getBoundingClientRect();
      if (rect.width) watch?.focus(rect.right + 3, rect.top + rect.height / 2);
      await sleep(between(...pace));
    }
    return mine === token;
  }

  // ---------------------------------------------------------------- calendar

  type MonthStep = { month: string; first: number; last: number; top: { repo: string; commits: number }[] };

  function monthParts(step: MonthStep): [string, string][] {
    const syn = (text: string): [string, string] => [text, "t-syn"];
    if (!step.top.length) return [syn("("), syn(`"${step.month}"`), syn(");")];
    const parts: [string, string][] = [syn("("), syn(`"${step.month}"`), syn(", { ")];
    step.top.forEach((item, k) => {
      if (k) parts.push(syn(", "));
      parts.push([JSON.stringify(item.repo), ""], syn(": "), [String(item.commits), ""]);
    });
    parts.push(syn(" });"), [" // public commits", ""]);
    return parts;
  }

  function buildCalendar({ days, done, top }: { days: Day[]; done: string; top: Record<string, { repo: string; commits: number }[]> }) {
    const offset = (new Date(`${days[0]!.date}T00:00:00Z`).getUTCDay() + 6) % 7;
    const weeks = Math.ceil((days.length + offset) / 7);
    const block = make("div", "t-cal");
    block.setAttribute("aria-hidden", "true");
    block.style.setProperty("--weeks", String(weeks));
    const put = (node: HTMLElement, r: number, c: number | string) => {
      node.style.gridRow = String(r);
      node.style.gridColumn = String(c);
      block.append(node);
    };
    WEEKDAYS.forEach((label, r) => put(make("span", "t-cal-day", label), r + 2, 1));
    for (let week = 0; week < weeks; week += 4) put(make("span", "t-cal-week", `W${String(week + 1).padStart(2, "0")}`), 9, week + 2);
    const cells: HTMLElement[] = [];
    const steps: MonthStep[] = [];
    days.forEach((day, k) => {
      const slot = k + offset;
      const cell = make("i", `l${day.level ?? 0}`);
      cell.dataset.tip = `${day.date} · ${day.count} contribution${day.count === 1 ? "" : "s"}`;
      put(cell, (slot % 7) + 2, Math.floor(slot / 7) + 2);
      cells.push(cell);
      const month = day.date.slice(0, 7);
      if (steps.at(-1)?.month !== month) {
        steps.push({ month, first: k, last: k, top: top[month] ?? [] });
        put(make("span", "t-cal-month", new Date(`${day.date}T00:00:00Z`).toLocaleString("en-US", { month: "short", timeZone: "UTC" })), 1, Math.floor(slot / 7) + 2);
      }
      steps.at(-1)!.last = k;
    });
    const legend = make("p", "t-cal-legend");
    legend.append("none");
    for (let level = 0; level <= 4; level++) legend.append(make("i", `l${level}`));
    legend.append("more");
    put(legend, 10, `1 / span ${weeks + 1}`);
    const code = make("div", "t-code");
    code.setAttribute("aria-hidden", "true");
    // Invisible copies of every call reserve the tallest line, so nothing jumps.
    for (const step of steps) code.append(make("span", "t-measure", `renderMonth${monthParts(step).map(([t]) => t).join("")} `));
    const live = make("span", "t-live");
    const args = make("span", "t-args");
    live.append(make("span", "t-call", "renderMonth"), args);
    code.append(live);
    return { block, code, live, args, cells, steps, done };
  }

  async function playCalendar(cal: ReturnType<typeof buildCalendar>, mine: number, instant: boolean) {
    if (instant) {
      cal.cells.forEach((cell) => cell.classList.add("is-on"));
      cal.live.replaceChildren(make("span", "t-done", cal.done));
      return true;
    }
    let head: HTMLElement | null = null;
    for (const step of cal.steps) {
      cal.args.replaceChildren();
      cal.code.classList.add("is-typing");
      for (const [text, cls] of monthParts(step)) {
        const part = make("span", cls);
        cal.args.append(part);
        if (!(await type(part, text, mine, CAL.key))) {
          cal.code.classList.remove("is-typing");
          return false;
        }
      }
      cal.code.classList.remove("is-typing");
      for (let k = step.first; k <= step.last; k++) {
        if (mine !== token) return false;
        head?.classList.remove("is-head");
        head = cal.cells[k]!;
        head.classList.add("is-on", "is-head");
        const rect = head.getBoundingClientRect();
        if (rect.width) options.watch()?.focus(rect.left + rect.width / 2, rect.top + rect.height / 2);
        await sleep(CAL.day);
      }
      await sleep(CAL.month);
    }
    head?.classList.remove("is-head");
    if (mine === token) cal.live.replaceChildren(make("span", "t-done", cal.done));
    return mine === token;
  }

  // ------------------------------------------------------------------ viewer

  type Viewer = {
    figure: HTMLElement;
    name: HTMLElement;
    count: HTMLElement;
    frame: HTMLElement;
    imgs: [HTMLImageElement, HTMLImageElement];
    front: number;
    run: HTMLElement;
    buttons: HTMLButtonElement[];
    shots: Shot[];
    at: number;
    hover: boolean;
    zoomed: boolean;
    visible: boolean;
    observer: IntersectionObserver;
  };

  function pace() {
    if (!viewer) return;
    (viewer.run.firstChild as HTMLElement).style.animationPlayState =
      viewer.hover || viewer.zoomed || !viewer.visible || document.hidden ? "paused" : "running";
  }

  function restart(hold: boolean) {
    if (!viewer || viewer.shots.length < 2 || reduced()) return;
    const { run } = viewer;
    run.classList.remove("is-running");
    void run.offsetWidth;
    run.style.setProperty("--run", `${hold ? RUN.hold : RUN.every}ms`);
    run.classList.add("is-running");
    pace();
  }

  function go(k: number, manual: boolean) {
    if (!viewer) return false;
    const n = viewer.shots.length;
    if (n < 2) return false;
    showShot(((k % n) + n) % n);
    restart(manual);
    return true;
  }

  function zoom(v: Viewer) {
    if (v.at < 0 || viewer !== v) return false;
    v.zoomed = true;
    pace();
    const fine = matchMedia("(pointer: fine)").matches;
    const many = v.shots.length > 1;
    options.lightbox.open({
      items: v.shots.map((shot, k) => ({
        src: shot.file,
        alt: shot.alt,
        left: [["shots "], ...(many ? [[`${k + 1}/${v.shots.length}`, "b"], [" · "]] : []), [shot.name, "b"]] as [string, string?][],
        right: fine ? [many ? "←→ shot · esc" : "esc"] : [many ? "swipe · tap closes" : "tap closes"],
      })),
      index: v.at,
      from: (k) => (viewer === v && v.at === k ? v.frame.getBoundingClientRect() : null),
      onStep: (k) => {
        if (viewer === v) go(k, true);
      },
      onClose: () => {
        v.zoomed = false;
        if (viewer === v) pace();
      },
    });
    return true;
  }

  function buildViewer(shots: Shot[]): Viewer {
    const figure = make("figure", "t-shot");
    const caption = make("figcaption");
    const name = make("span", "t-name");
    const count = make("span", "t-count");
    const help = make("span", "t-help", shots.length > 1 ? (matchMedia("(pointer: fine)").matches ? "←→ shot" : "swipe") : "");
    caption.append(name, count, help);
    const frame = make("div", "t-frame");
    const imgs = [make("img"), make("img")] as [HTMLImageElement, HTMLImageElement];
    for (const img of imgs) {
      img.decoding = "async";
      img.draggable = false;
      img.alt = "";
      frame.append(img);
    }
    const lens = zoomButton("t-zoom");
    frame.append(lens);
    const run = make("span", "t-run");
    run.setAttribute("aria-hidden", "true");
    run.append(make("i"));
    const dots = make("p", "t-dots");
    const v = { figure, name, count, frame, imgs, front: 0, run, buttons: [] as HTMLButtonElement[], shots, at: -1, hover: false, zoomed: false, visible: true } as unknown as Viewer;
    v.buttons = shots.map((_, k) => {
      const button = make("button", "t-dot", String(k + 1));
      button.type = "button";
      button.setAttribute("aria-label", `Shot ${k + 1} of ${shots.length}`);
      button.addEventListener("click", () => go(k, true));
      dots.append(button);
      return button;
    });
    figure.append(caption, frame);
    if (shots.length > 1) figure.append(run, dots);
    lens.addEventListener("click", (event) => {
      event.stopPropagation();
      zoom(v);
    });
    frame.addEventListener("click", () => zoom(v));
    frame.addEventListener("pointerenter", (event) => {
      if (event.pointerType !== "mouse") return;
      v.hover = true;
      pace();
    });
    frame.addEventListener("pointerleave", () => {
      v.hover = false;
      pace();
    });
    let swipe: { x: number; y: number } | null = null;
    frame.addEventListener("pointerdown", (event) => {
      if (event.pointerType !== "mouse") swipe = { x: event.clientX, y: event.clientY };
    });
    frame.addEventListener("pointerup", (event) => {
      if (!swipe) return;
      const dx = event.clientX - swipe.x;
      const dy = event.clientY - swipe.y;
      swipe = null;
      if (Math.abs(dx) > 40 && Math.abs(dx) > Math.abs(dy) * 1.4 && viewer === v) go(v.at + (dx < 0 ? 1 : -1), true);
    });
    run.addEventListener("animationend", () => {
      if (viewer === v) go(v.at + 1, false);
    });
    v.observer = new IntersectionObserver(([entry]) => {
      v.visible = Boolean(entry?.isIntersecting);
      pace();
    });
    v.observer.observe(frame);
    return v;
  }

  function showShot(k: number) {
    const v = viewer;
    if (!v || !v.shots[k] || v.at === k) return;
    v.at = k;
    const shot = v.shots[k]!;
    const back = v.imgs[1 - v.front]!;
    const front = v.imgs[v.front]!;
    const reveal = () => {
      back.onload = back.onerror = null;
      if (viewer !== v || v.at !== k) return;
      back.alt = shot.alt;
      front.alt = "";
      back.classList.add("is-on");
      front.classList.remove("is-on");
      v.front = 1 - v.front;
    };
    if (back.getAttribute("src") === shot.file && back.complete && back.naturalWidth) reveal();
    else {
      back.onload = back.onerror = reveal;
      back.src = shot.file;
    }
    v.name.textContent = shot.name;
    v.count.textContent = v.shots.length > 1 ? `${k + 1}/${v.shots.length}` : "";
    v.buttons.forEach((button, j) => button.setAttribute("aria-current", String(j === k)));
  }

  function stopViewer() {
    options.lightbox.close(true);
    viewer?.observer.disconnect();
  }

  const onVisibility = () => pace();
  document.addEventListener("visibilitychange", onVisibility);

  // ------------------------------------------------------------------ player

  async function play(spec: Spec, mine: number) {
    const instant = reduced();
    if (!instant) options.onTyping?.(true);
    try {
      for (const block of spec.blocks) {
        if (mine !== token) return;
        buffer.append(row(prompt(spec.cwd, spec.branch), "t-prompt-row"));
        const cmd = make("span", "t-cmd");
        const line = row([["› ", "t-caret"]]);
        line.firstChild!.appendChild(cmd);
        buffer.append(line);
        if (instant) cmd.textContent = block.cmd;
        else {
          await sleep(PACE.gap);
          if (!(await type(cmd, block.cmd, mine))) return;
          await sleep(PACE.enter);
          if (mine !== token) return;
          options.watch()?.pressKey("Enter");
        }
        if (block.link) {
          cmd.replaceChildren(block.cmd.slice(0, block.cmd.length - block.link.text.length));
          fill(cmd, [[block.link.text, "", block.link.href]]);
        }
        for (const out of block.out ?? ([] as Out[])) {
          if (mine !== token) return;
          buffer.append(row(out.segs, out.cls));
          if (!instant) await sleep(PACE.line);
        }
        if (block.archive && mine === token && options.mountArchive) {
          const host = make("div", "t-mount");
          buffer.append(host);
          mounts.push(options.mountArchive(host, block.archive));
        }
        if (block.calendar && mine === token) {
          const cal = buildCalendar(block.calendar);
          buffer.append(cal.code, cal.block);
          if (!(await playCalendar(cal, mine, instant))) return;
        }
        if (block.viewer && viewer && mine === token) {
          buffer.append(viewer.figure);
          showShot(0);
          restart(false);
        }
      }
      if (mine !== token) return;
      buffer.append(row(prompt(spec.cwd, spec.branch), "t-prompt-row"), row([["› ", "t-caret"], ["", "t-cursor"]], "t-idle"));
    } finally {
      if (mine === token) options.onTyping?.(false);
    }
  }

  function teardown() {
    stopViewer();
    for (const stop of mounts) stop();
    mounts = [];
    hero?.destroy();
    hero = null;
    viewer = null;
  }

  return {
    show(spec: Spec) {
      const mine = ++token;
      teardown();
      viewer = spec.shots?.length ? buildViewer(spec.shots) : null;
      buffer.replaceChildren();
      if (spec.hero && options.mountHero) {
        const host = make("div", "t-hero");
        buffer.append(host);
        hero = options.mountHero(host);
      }
      for (const out of spec.head ?? []) buffer.append(row(out.segs, out.cls));
      void play(spec, mine);
    },
    step(delta: number) {
      return viewer && viewer.at >= 0 ? go(viewer.at + delta, true) : false;
    },
    zoom() {
      return viewer?.visible ? zoom(viewer) : false;
    },
    refit,
    recolor() {
      hero?.recolor?.();
    },
    destroy() {
      token++;
      options.onTyping?.(false);
      teardown();
    },
    dispose() {
      this.destroy();
      document.removeEventListener("visibilitychange", onVisibility);
    },
  };
}

export type Terminal = ReturnType<typeof createTerminal>;
