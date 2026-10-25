import { palettes } from "@/config/palettes";
import { PALETTE_EVENT, currentPalette, setPalette } from "@/lib/palette-client";
import { createWatch, type Watch } from "./watch";
import { FONT, TAU, between, clamp, fit, readColors, reduced, sleep, smooth, type Colors } from "./util";

/**
 * The intro (/): a wall of this site's own source in vim panes. A ghost edits
 * it now and then, a message gets carved out of it, an eye opens in it, and
 * `enter` collapses everything into a black hole that drops you into /site.
 */

const CW = 7.2;
const CH = 13;
const GUTTER = 5;
const GLYPHS = "░▒▓/\\<>+=*#%&@$0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ";
const MESSAGES = [
  ["i break", "the things", "you ship."],
  ["then i build", "the walls", "that hold."],
];
const KEYWORDS = new Set(
  "import export from as default const let var function return if else for while do switch case break continue new typeof instanceof in of true false null undefined this class extends static async await type interface try catch finally throw void readonly keyof".split(
    " ",
  ),
);
type Kind = "keyword" | "string" | "number" | "function" | "type" | "comment" | "member" | "ident" | "punct" | "space";
/** How strongly each kind of token shows on the wall (alpha of its colour). */
const STRENGTH: Record<Kind, number> = { keyword: 0.75, string: 0.66, number: 0.75, function: 0.8, type: 0.7, comment: 0.48, member: 0.36, ident: 0.3, punct: 0.26, space: 0 };
const TINT: Partial<Record<Kind, keyof Colors>> = { keyword: "kw", string: "str", number: "num", function: "fn", type: "ty", comment: "dim" };

export type WallFile = { path: string; lines: string[] };

function tokenize(line: string): Kind[] {
  const kinds: Kind[] = new Array(line.length).fill("space");
  let i = 0;
  while (i < line.length) {
    const ch = line[i]!;
    const rest = line.slice(i);
    if (rest.startsWith("//") || (rest.startsWith("*") && line.trimStart().startsWith("*")) || rest.startsWith("/*")) {
      kinds.fill("comment", i);
      break;
    }
    if (ch === '"' || ch === "'" || ch === "`") {
      let j = i + 1;
      while (j < line.length && line[j] !== ch) j += line[j] === "\\" ? 2 : 1;
      kinds.fill("string", i, Math.min(line.length, j + 1));
      i = j + 1;
      continue;
    }
    if (/[0-9]/.test(ch) && !/[\w$]/.test(line[i - 1] ?? "")) {
      const m = rest.match(/^[0-9][0-9_.xXa-fA-F]*/)!;
      kinds.fill("number", i, i + m[0].length);
      i += m[0].length;
      continue;
    }
    if (/[A-Za-z_$]/.test(ch)) {
      const m = rest.match(/^[\w$]+/)!;
      const word = m[0];
      const after = line.slice(i + word.length).trimStart()[0];
      const kind: Kind = KEYWORDS.has(word) ? "keyword" : line[i - 1] === "." ? (after === "(" ? "function" : "member") : after === "(" ? "function" : /^[A-Z]/.test(word) ? "type" : "ident";
      kinds.fill(kind, i, i + word.length);
      i += word.length;
      continue;
    }
    if (ch !== " ") kinds[i] = "punct";
    i++;
  }
  return kinds;
}

export function mountIntro(root: HTMLElement, files: WallFile[], { next = "/site" }: { next?: string } = {}) {
  const $ = <T extends Element>(s: string) => root.querySelector<T>(s)!;
  const canvas = $<HTMLCanvasElement>(".hc-wall");
  const status = $<HTMLElement>(".hc-status");
  const statusPath = status.querySelector<HTMLElement>(".path")!;
  const statusPos = status.querySelector<HTMLElement>(".pos")!;
  const statusMode = status.querySelector<HTMLElement>(".mode")!;
  const cmdline = $<HTMLElement>(".hc-cmdline");
  const cmd = cmdline.querySelector<HTMLElement>(".cmd")!;
  const showcmd = cmdline.querySelector<HTMLElement>(".showcmd")!;
  const enter = $<HTMLAnchorElement>(".hc-enter");
  const themeKey = $<HTMLButtonElement>(".hc-theme-key");
  const eyeHost = $<HTMLElement>(".hc-eye");
  const desk = $<HTMLElement>(".hc-desk");

  const sources = files.map((f) => ({ path: f.path, lines: f.lines, kinds: f.lines.map(tokenize) }));
  let colors: Colors = readColors(root);
  let alive = true;
  let leaving = false;
  let W = 0;
  let H = 0;
  let cols = 0;
  let rows = 0;
  let wallRows = 0;
  type Pane = { x0: number; w: number; file: number; top: number; cursor: [number, number] };
  let panes: Pane[] = [];
  // What each cell shows, plus a scramble countdown for morphing cells.
  let chars: string[] = [];
  let kinds: Kind[] = [];
  let edits = new Map<number, { ch: string; kind: Kind; alpha: number }>();
  const scramble = new Map<number, number>();
  let carved: { c0: number; r0: number; w: number; h: number } | null = null;
  let eyeTile: { c0: number; r0: number; w: number; h: number } | null = null;
  let raf = 0;
  let caret: { c: number; r: number } | null = null;
  let dive: { start: number; cx: number; cy: number; R0: number; parts: { r: number; a: number; s: number; w: number }[] } | null = null;
  let token = 0;

  const watch: Watch = createWatch({
    root,
    layer: $<HTMLCanvasElement>(".hc-overlay"),
    deskHost: desk,
    eyeHost,
    buffer: $<HTMLElement>(".hc-ghost-buffer"),
    status: $<HTMLElement>(".hc-ghost-status"),
    den: null,
    wormOn: false,
  });

  // ----------------------------------------------------------------- layout

  /** Where the wall sits on screen (it is inset like an editor window). */
  const origin = { x: 0, y: 0 };

  function layout() {
    const fullCols = Math.floor(window.innerWidth / CW);
    rows = Math.floor(window.innerHeight / CH);
    const inset = fullCols >= 60 ? 5 : 2;
    const topRows = Math.max(6, Math.round(rows * 0.12));
    origin.x = inset * CW;
    origin.y = topRows * CH;
    cols = fullCols - inset * 2;
    wallRows = clamp(rows - topRows - 14, 10, Math.max(10, rows - topRows - 4));
    W = cols * CW;
    H = wallRows * CH;
    canvas.style.left = `${origin.x}px`;
    canvas.style.top = `${origin.y}px`;
    canvas.style.width = `${W}px`;
    canvas.style.height = `${H}px`;
    const count = cols >= 200 ? 2 : 1;
    const paneW = Math.floor(cols / count);
    const old = panes;
    panes = Array.from({ length: count }, (_, k) => {
      const prev = old[k];
      const file = prev?.file ?? (k * 3 + Math.floor(Math.random() * sources.length)) % sources.length;
      return { x0: k * paneW, w: paneW - (k < count - 1 ? 1 : 0), file, top: prev?.top ?? Math.floor(Math.random() * Math.max(1, sources[file]!.lines.length - wallRows)), cursor: prev?.cursor ?? [0, 0] };
    });
    chars = new Array(cols * wallRows).fill(" ");
    kinds = new Array(cols * wallRows).fill("space");
    edits = new Map();
    for (const pane of panes) fillPane(pane);
    const pane = panes[panes.length - 1]!;
    status.style.left = `${origin.x + pane.x0 * CW}px`;
    status.style.width = `${pane.w * CW}px`;
    status.style.top = `${origin.y + wallRows * CH}px`;
    cmdline.style.left = `${origin.x + pane.x0 * CW}px`;
    cmdline.style.width = `${pane.w * CW}px`;
    cmdline.style.top = `${origin.y + (wallRows + 1) * CH}px`;
    desk.style.top = `${origin.y + (wallRows + 3) * CH}px`;
    desk.style.height = `${Math.max(0, window.innerHeight - origin.y - (wallRows + 6) * CH)}px`;
    enter.style.right = `${5 * CW}px`;
    enter.style.bottom = `${2 * CH}px`;
    themeKey.style.right = `${(5 + 10) * CW}px`;
    themeKey.style.bottom = `${2 * CH}px`;
    paintStatus(pane);
    request();
  }

  function fillPane(pane: Pane) {
    const src = sources[pane.file]!;
    for (let r = 0; r < wallRows; r++) {
      const n = pane.top + r;
      const line = src.lines[n];
      for (let c = 0; c < pane.w; c++) {
        const i = r * cols + pane.x0 + c;
        let ch = " ";
        let kind: Kind = "space";
        if (line !== undefined) {
          if (c < GUTTER - 1) {
            const label = String(n + 1).padStart(GUTTER - 1);
            ch = label[c]!;
            kind = ch === " " ? "space" : "comment";
          } else if (c >= GUTTER) {
            ch = line[c - GUTTER] ?? " ";
            kind = src.kinds[n]![c - GUTTER] ?? "space";
          }
        } else if (c === 0) {
          ch = "~";
          kind = "comment";
        }
        chars[i] = ch;
        kinds[i] = kind;
      }
    }
  }

  function paintStatus(pane: Pane, mode = "NORMAL") {
    const src = sources[pane.file]!;
    statusMode.textContent = mode;
    status.classList.toggle("is-insert", mode === "INSERT");
    statusPath.textContent = `~/portfolio/${src.path}`;
    const line = pane.top + pane.cursor[1] + 1;
    const pct = Math.round(((pane.top + wallRows) / Math.max(1, src.lines.length)) * 100);
    statusPos.textContent = `${line}:${pane.cursor[0] + 1}  ${pane.top === 0 ? "Top" : pct >= 100 ? "Bot" : `${pct}%`}`;
  }

  const inside = (box: { c0: number; r0: number; w: number; h: number } | null, c: number, r: number) => Boolean(box && c >= box.c0 && c < box.c0 + box.w && r >= box.r0 && r < box.r0 + box.h);

  // ------------------------------------------------------------------- draw

  function draw(now: number) {
    const g = fit(canvas, W, H);
    g.clearRect(0, 0, W, H);
    g.font = FONT(12);
    g.textBaseline = "alphabetic";
    // Batch glyphs by fill style.
    const batches = new Map<string, { x: number; y: number; ch: string }[]>();
    const put = (style: string, x: number, y: number, ch: string) => {
      let list = batches.get(style);
      if (!list) batches.set(style, (list = []));
      list.push({ x, y, ch });
    };
    for (let r = 0; r < wallRows; r++) {
      for (let c = 0; c < cols; c++) {
        if (inside(carved, c, r) || inside(eyeTile, c, r)) continue;
        const i = r * cols + c;
        const edit = edits.get(i);
        let ch = edit?.ch ?? chars[i]!;
        const kind = edit?.kind ?? kinds[i]!;
        const left = scramble.get(i);
        if (left !== undefined) ch = left > 0 ? GLYPHS[Math.floor(Math.random() * GLYPHS.length)]! : ch;
        if (ch === " ") continue;
        const tone = TINT[kind] ? colors[TINT[kind]!] : colors.ink;
        const alpha = edit?.alpha ?? (STRENGTH[kind] ?? 0.3) * 0.62;
        put(`rgba(${tone}, ${(left && left > 0 ? 0.5 : alpha).toFixed(2)})`, c * CW, r * CH + 10.5, ch);
      }
    }
    for (const [style, list] of batches) {
      g.fillStyle = style;
      for (const p of list) g.fillText(p.ch, p.x, p.y);
    }
    if (carved && carvedText) {
      g.font = FONT(12);
      g.fillStyle = `rgba(${colors.ink}, 0.97)`;
      carvedText.forEach((line, k) => g.fillText(line, (carved!.c0 + 6) * CW, (carved!.r0 + 2 + k * 2) * CH + 10.5));
    }
    if (caret && (Math.floor(now / 530) % 2 === 0 || now - typedAt < 400)) {
      g.fillStyle = `rgba(${colors.accent}, 0.95)`;
      g.fillRect(caret.c * CW, caret.r * CH, CW, CH);
    }
    if (dive) drawDive(g, now);
  }

  let typedAt = 0;
  let carvedText: string[] | null = null;

  function tick(now: number) {
    raf = 0;
    if (!alive) return;
    let busy = Boolean(caret) || Boolean(dive);
    for (const [i, left] of scramble) {
      if (left <= 0) scramble.delete(i);
      else {
        scramble.set(i, left - 1);
        busy = true;
      }
    }
    draw(now);
    if (busy) raf = requestAnimationFrame(tick);
  }
  const request = () => {
    if (!raf && alive) raf = requestAnimationFrame(tick);
  };

  /** Morph a block of cells through random glyphs. */
  function stir(c0: number, r0: number, w: number, h: number, spread = 12) {
    if (reduced()) return;
    for (let r = r0; r < Math.min(wallRows, r0 + h); r++) for (let c = c0; c < Math.min(cols, c0 + w); c++) if (chars[r * cols + c] !== " ") scramble.set(r * cols + c, 2 + Math.floor(Math.random() * spread));
    request();
  }

  // ---------------------------------------------------------------- cmdline

  async function say(text: string, mine = token, pace = 34) {
    cmdline.classList.add("is-typing");
    cmd.textContent = "";
    for (let n = 1; n <= text.length; n++) {
      if (mine !== token || !alive) return false;
      cmd.textContent = text.slice(0, n);
      watch.pressChar(text[n - 1]!);
      const rect = cmd.getBoundingClientRect();
      watch.focus(rect.right + 4, rect.top + rect.height / 2);
      await sleep(reduced() ? 0 : pace + Math.random() * 30);
    }
    cmdline.classList.remove("is-typing");
    watch.pressKey("Enter");
    return true;
  }

  // ------------------------------------------------------------------ ghost

  /** Retype one identifier somewhere on the wall, like someone editing. */
  async function ghostEdit(mine: number) {
    const pane = panes[Math.floor(Math.random() * panes.length)]!;
    const src = sources[pane.file]!;
    for (let tries = 0; tries < 20; tries++) {
      const r = Math.floor(Math.random() * wallRows);
      const n = pane.top + r;
      const line = src.lines[n];
      if (!line) continue;
      const words = [...line.matchAll(/[A-Za-z_]\w{3,}/g)].filter((m) => m.index! + m[0].length + GUTTER < pane.w);
      if (!words.length) continue;
      const m = words[Math.floor(Math.random() * words.length)]!;
      const at = pane.x0 + GUTTER + m.index!;
      if ([...Array(m[0].length).keys()].some((k) => inside(carved, at + k, r) || inside(eyeTile, at + k, r))) continue;
      const word = m[0];
      pane.cursor = [m.index! + word.length, r];
      paintStatus(pane, "NORMAL");
      caret = { c: at + word.length, r };
      showcmd.textContent = "ciw";
      request();
      await sleep(500);
      paintStatus(pane, "INSERT");
      showcmd.textContent = "";
      // Delete back to the start of the word.
      for (let k = word.length - 1; k >= 0; k--) {
        if (mine !== token) return;
        edits.set(r * cols + at + k, { ch: " ", kind: "space", alpha: 0 });
        caret = { c: at + k, r };
        watch.pressKey("Backspace");
        typedAt = performance.now();
        request();
        await sleep(between(30, 60));
      }
      // Type it back, sometimes fumbling a key and fixing it.
      const typo = Math.random() < 0.35 ? Math.floor(Math.random() * word.length) : -1;
      for (let k = 0; k < word.length; k++) {
        if (mine !== token) return;
        if (k === typo) {
          const wrong = String.fromCharCode(97 + Math.floor(Math.random() * 26));
          edits.set(r * cols + at + k, { ch: wrong, kind: "ident", alpha: 0.95 });
          caret = { c: at + k + 1, r };
          watch.pressChar(wrong);
          request();
          await sleep(between(160, 260));
          watch.pressKey("Backspace");
          edits.set(r * cols + at + k, { ch: " ", kind: "space", alpha: 0 });
          caret = { c: at + k, r };
          request();
          await sleep(between(90, 140));
        }
        edits.set(r * cols + at + k, { ch: word[k]!, kind: kinds[r * cols + at + k]!, alpha: 0.95 });
        caret = { c: at + k + 1, r };
        watch.pressChar(word[k]!);
        typedAt = performance.now();
        const x = (at + k + 1) * CW;
        const rect = canvas.getBoundingClientRect();
        watch.focus(rect.left + x, rect.top + r * CH + CH / 2);
        request();
        await sleep(between(50, 120));
      }
      await sleep(260);
      watch.pressKey("Escape");
      paintStatus(pane, "NORMAL");
      for (let k = 0; k < word.length; k++) edits.delete(r * cols + at + k);
      caret = null;
      request();
      return;
    }
  }

  /** Scroll a pane by some lines (with a little scramble on the new rows). */
  function scrollPane(pane: Pane, by: number) {
    const src = sources[pane.file]!;
    const top = clamp(pane.top + by, 0, Math.max(0, src.lines.length - wallRows + 6));
    if (top === pane.top) return;
    pane.top = top;
    fillPane(pane);
    edits.clear();
    stir(pane.x0, 0, pane.w, wallRows, 4);
    paintStatus(pane);
    request();
  }

  function swapFile(pane: Pane) {
    pane.file = (pane.file + 1 + Math.floor(Math.random() * (sources.length - 1))) % sources.length;
    pane.top = Math.floor(Math.random() * Math.max(1, sources[pane.file]!.lines.length - wallRows));
    fillPane(pane);
    stir(pane.x0, 0, pane.w, wallRows, 14);
    paintStatus(pane);
  }

  async function carve(lines: string[], mine: number) {
    const longest = Math.max(...lines.map((l) => l.length));
    const w = longest + 12;
    const h = lines.length * 2 + 3;
    const pane = panes[0]!;
    const c0 = clamp(pane.x0 + Math.floor(pane.w * 0.18 + Math.random() * pane.w * 0.3), GUTTER + 2, cols - w - 2);
    const r0 = clamp(Math.floor(wallRows * 0.2 + Math.random() * wallRows * 0.35), 4, Math.max(4, wallRows - h - 1));
    stir(c0, r0, w, h, 10);
    await sleep(300);
    carved = { c0, r0, w, h };
    carvedText = lines.map(() => "");
    request();
    for (let k = 0; k < lines.length; k++) {
      for (let n = 1; n <= lines[k]!.length; n++) {
        if (mine !== token) return;
        carvedText[k] = lines[k]!.slice(0, n);
        watch.pressChar(lines[k]![n - 1]!);
        const rect = canvas.getBoundingClientRect();
        watch.focus(rect.left + (c0 + 6 + n) * CW, rect.top + (r0 + 2 + k * 2) * CH + CH / 2);
        request();
        await sleep(between(60, 130));
      }
      await sleep(240);
    }
    await sleep(4200);
    if (mine !== token) return;
    carved = null;
    carvedText = null;
    stir(c0, r0, w, h, 10);
  }

  function openEye(at?: { c: number; r: number }) {
    const w = 40;
    const h = 13;
    const pane = panes[panes.length - 1]!;
    const c0 = clamp(at ? at.c - w / 2 : pane.x0 + pane.w - w - 8 - Math.floor(Math.random() * 20), 2, cols - w - 2);
    const r0 = clamp(at ? at.r - Math.floor(h / 2) : 3 + Math.floor(Math.random() * Math.max(1, wallRows - h - 6)), 1, Math.max(1, wallRows - h - 1));
    eyeTile = { c0, r0, w, h };
    stir(c0, r0, w, h, 8);
    eyeHost.style.left = `${origin.x + c0 * CW}px`;
    eyeHost.style.top = `${origin.y + r0 * CH}px`;
    eyeHost.style.width = `${w * CW}px`;
    eyeHost.style.height = `${h * CH}px`;
    request();
  }

  function closeEye() {
    if (!eyeTile) return;
    const t = eyeTile;
    eyeTile = null;
    eyeHost.style.width = "0px";
    eyeHost.style.height = "0px";
    stir(t.c0, t.r0, t.w, t.h, 10);
  }

  async function director(mine: number) {
    await sleep(reduced() ? 0 : 400);
    await say("nvim ~/portfolio", mine, 60);
    if (mine !== token) return;
    status.classList.add("is-on");
    cmdline.classList.add("is-on");
    if (!reduced()) for (const pane of panes) stir(pane.x0, 0, pane.w, wallRows, 22);
    await sleep(1400);
    cmd.textContent = "";
    let beat = 0;
    while (alive && mine === token) {
      await sleep(between(1000, 2200));
      if (mine !== token || document.hidden) continue;
      beat++;
      if (beat % 9 === 3) await carve(MESSAGES[Math.floor(beat / 9) % MESSAGES.length]!, mine);
      else if (beat % 9 === 6 && !eyeTile) {
        openEye();
        setTimeout(() => mine === token && !leaving && closeEye(), 6000);
      } else if (beat % 7 === 0) swapFile(panes[Math.floor(Math.random() * panes.length)]!);
      else if (beat % 4 === 0) scrollPane(panes[Math.floor(Math.random() * panes.length)]!, Math.random() < 0.5 ? 3 : -3);
      else await ghostEdit(mine);
    }
  }

  // ------------------------------------------------------------- black hole

  function startDive(cx: number, cy: number, R0: number) {
    const far = Math.hypot(W, H);
    const count = W < 700 ? 2600 : 5200;
    const parts = Array.from({ length: count }, () => ({ r: R0 + 6 + Math.random() ** 2 * far, a: Math.random() * TAU, s: 0.6 + Math.random() * 0.8, w: (0.15 + Math.random() * 0.35) * (Math.random() < 0.5 ? -1 : 1) }));
    dive = { start: performance.now(), cx, cy, R0, parts };
    request();
  }

  let diveLast = 0;
  function drawDive(g: CanvasRenderingContext2D, now: number) {
    const d = dive!;
    const t = (now - d.start) / 1700;
    if (t >= 1) {
      g.fillStyle = "#000";
      g.fillRect(0, 0, W, H);
      return;
    }
    const dt = diveLast ? Math.min(0.05, (now - diveLast) / 1000) : 1 / 60;
    diveLast = now;
    const glide = smooth(t / 0.45);
    const cx = d.cx + (W / 2 - d.cx) * glide;
    const cy = d.cy + (H / 2 - d.cy) * glide;
    const side = Math.min(W, H);
    const far = Math.hypot(W, H);
    // Open to a third of the screen, hang there, then swallow everything.
    const R = d.R0 + (0.3 * side - d.R0) * (1 - (1 - clamp(t / 0.3, 0, 1)) ** 3) + 0.08 * side * smooth((t - 0.3) / 0.5) + far * smooth((t - 0.8) / 0.2) ** 2;
    const pull = 1 + 2.5 * t + 14 * smooth((t - 0.78) / 0.22);
    const fade = smooth(t / 0.22);
    const bands = Array.from({ length: 10 }, () => new Path2D());
    for (const p of d.parts) {
      if (p.r <= R + 0.5) {
        p.r = R + 8 + Math.random() ** 2.2 * far;
        p.a = Math.random() * TAU;
        continue;
      }
      const v = (70 + 14000 / (Math.max(4, p.r - R) + 40)) * p.s * pull;
      p.r -= v * dt;
      p.a += p.w * dt * (1 + (2 * R) / Math.max(p.r, 1));
      if (p.r <= R + 0.5) continue;
      const tail = Math.min(p.r - R + 60, v * 0.05 + 2);
      const glow = Math.exp(-(p.r - R) / (0.3 * R + 70));
      const k = Math.min(9, Math.floor((0.1 + 0.9 * glow) * 10));
      const ca = Math.cos(p.a);
      const sa = Math.sin(p.a);
      bands[k]!.moveTo(cx + ca * (p.r + tail), cy + sa * (p.r + tail));
      bands[k]!.lineTo(cx + ca * p.r, cy + sa * p.r);
    }
    const ink = colors.ink;
    const halo = g.createRadialGradient(cx, cy, R, cx, cy, R * 1.6 + 40);
    halo.addColorStop(0, `rgba(${ink}, ${(0.16 * fade).toFixed(3)})`);
    halo.addColorStop(1, `rgba(${ink}, 0)`);
    g.fillStyle = halo;
    g.fillRect(0, 0, W, H);
    g.lineCap = "round";
    g.lineWidth = 1;
    bands.forEach((path, k) => {
      g.strokeStyle = `rgba(${ink}, ${(fade * (0.18 + (0.82 * (k + 1)) / 10)).toFixed(3)})`;
      g.stroke(path);
    });
    for (const [width, alpha] of [
      [14, 0.05],
      [6, 0.12],
      [2.2, 0.45],
      [1, 0.95],
    ] as const) {
      g.lineWidth = width;
      g.strokeStyle = `rgba(${ink}, ${(alpha * fade).toFixed(3)})`;
      g.beginPath();
      g.arc(cx, cy, R + width * 0.3, 0, TAU);
      g.stroke();
    }
    g.fillStyle = "#000";
    g.beginPath();
    g.arc(cx, cy, R, 0, TAU);
    g.fill();
  }

  async function leave() {
    if (leaving) return;
    leaving = true;
    token++;
    caret = null;
    carved = null;
    if (reduced()) {
      location.href = next;
      return;
    }
    root.classList.add("is-leaving");
    if (!eyeTile) openEye({ c: Math.floor(cols / 2), r: Math.floor(wallRows / 2) });
    await sleep(700);
    // Dissolve the wall outward from the eye.
    const ex = eyeTile ? (eyeTile.c0 + eyeTile.w / 2) * CW : W / 2;
    const ey = eyeTile ? (eyeTile.r0 + eyeTile.h / 2) * CH : H / 2;
    for (let r = 0; r < wallRows; r++)
      for (let c = 0; c < cols; c++) {
        const i = r * cols + c;
        if (chars[i] === " ") continue;
        const d = Math.hypot(c * CW - ex, r * CH - ey) / Math.hypot(W, H);
        scramble.set(i, 2 + Math.round(d * 20) + Math.floor(Math.random() * 3));
        chars[i] = " ";
      }
    request();
    await sleep(600);
    // The black hole needs the whole screen.
    W = window.innerWidth;
    H = window.innerHeight;
    canvas.style.left = "0px";
    canvas.style.top = "0px";
    canvas.style.width = `${W}px`;
    canvas.style.height = `${H}px`;
    wallRows = 0;
    startDive(origin.x + ex, origin.y + ey, 12);
    await sleep(1700);
    location.href = next;
  }

  // ----------------------------------------------------------------- events

  const onEnter = (event: MouseEvent) => {
    if (event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
    event.preventDefault();
    void leave();
  };
  const cycleTheme = (step: number) => {
    const names = palettes.map((p) => p.name);
    const nextName = names[(names.indexOf(currentPalette()) + step + names.length) % names.length]!;
    setPalette(nextName, { transition: false });
    void say(`:colorscheme ${nextName}`, token, 14).then(() => setTimeout(() => (cmd.textContent = ""), 1800));
  };
  const onTheme = (event: MouseEvent) => cycleTheme(event.shiftKey ? -1 : 1);
  const onKey = (event: KeyboardEvent) => {
    if (event.defaultPrevented || event.ctrlKey || event.metaKey || event.altKey || leaving) return;
    if (!event.repeat) watch.pressKey(event.code, event.shiftKey);
    const active = document.activeElement;
    const free = !active || active === document.body || active === enter;
    if (event.key === "Enter" && free) {
      event.preventDefault();
      void leave();
    } else if (event.key === ":" || event.key === "t") {
      event.preventDefault();
      cycleTheme(1);
    } else if (event.key === "ArrowDown" || event.key === "j") scrollPane(panes[0]!, 3);
    else if (event.key === "ArrowUp" || event.key === "k") scrollPane(panes[0]!, -3);
  };
  const onWheel = (event: WheelEvent) => {
    const c = Math.floor((event.clientX - origin.x) / CW);
    const pane = panes.find((p) => c >= p.x0 && c < p.x0 + p.w) ?? panes[0]!;
    scrollPane(pane, Math.sign(event.deltaY) * 3);
  };
  let dwell = 0;
  const onPointer = (event: PointerEvent) => {
    clearTimeout(dwell);
    if (eyeTile || leaving || event.pointerType !== "mouse") return;
    const at = { c: Math.floor((event.clientX - origin.x) / CW), r: Math.floor((event.clientY - origin.y) / CH) };
    if (at.r < 0 || at.r >= wallRows || at.c < 0 || at.c >= cols) return;
    // Rest the pointer on the wall for a while and an eye opens there.
    dwell = window.setTimeout(() => {
      if (eyeTile || leaving) return;
      openEye(at);
      setTimeout(() => !leaving && closeEye(), 6000);
    }, 2600);
  };
  const onPalette = () =>
    requestAnimationFrame(() => {
      colors = readColors(root);
      watch.recolor();
      request();
    });
  const onPageShow = (event: PageTransitionEvent) => {
    if (event.persisted && leaving) location.reload();
  };
  let resizeFrame = 0;
  const onResize = () => {
    cancelAnimationFrame(resizeFrame);
    resizeFrame = requestAnimationFrame(layout);
  };
  enter.addEventListener("click", onEnter);
  themeKey.addEventListener("click", onTheme);
  document.addEventListener("keydown", onKey);
  canvas.addEventListener("wheel", onWheel, { passive: true });
  window.addEventListener("pointermove", onPointer, { passive: true });
  window.addEventListener(PALETTE_EVENT, onPalette);
  window.addEventListener("pageshow", onPageShow);
  window.addEventListener("resize", onResize);

  layout();
  document.fonts?.ready.then(() => alive && request());
  void director(++token);

  return () => {
    alive = false;
    token++;
    cancelAnimationFrame(raf);
    clearTimeout(dwell);
    watch.destroy();
    enter.removeEventListener("click", onEnter);
    themeKey.removeEventListener("click", onTheme);
    document.removeEventListener("keydown", onKey);
    canvas.removeEventListener("wheel", onWheel);
    window.removeEventListener("pointermove", onPointer);
    window.removeEventListener(PALETTE_EVENT, onPalette);
    window.removeEventListener("pageshow", onPageShow);
    window.removeEventListener("resize", onResize);
  };
}
