import type { EditorData, Entry } from "@/lib/editor/types";
import { palettes } from "@/config/palettes";
import { PALETTE_EVENT, currentPalette, setPalette } from "@/lib/palette-client";
import { createArchive } from "./archive";
import { createBar, createTips } from "./bar";
import { createBlueprint } from "./blueprint";
import { createLightbox } from "./lightbox";
import { createTerminal } from "./terminal";
import { createWatch, type Watch } from "./watch";
import { createWheel, type Wheel } from "./wheel";
import { reduced, sleep } from "./util";

/**
 * Boots /site: wires the wheel, the terminal, the bar and the overlay
 * together, plus vim-ish keys and a `:` command line. Returns a teardown.
 */

const WORM_KEY = "hd.worm";
const KEYS = { wide: "↑↓ entry · ←→ shot · ↩ enter · : cmd", touch: "swipe the wheel · tap to open", closed: "tap ~/ ↓ to browse" };
const key = (value: string) => value.toLowerCase().replace(/[^a-z0-9]/g, "");

export function mountEditor(root: HTMLElement, data: EditorData) {
  const $ = <T extends Element>(selector: string) => root.querySelector<T>(selector)!;
  const editor = $<HTMLElement>(".hc-editor");
  const wheelHost = $<HTMLElement>(".hc-wheel");
  const buffer = $<HTMLElement>(".hc-buffer");
  const winbar = $<HTMLElement>(".hc-winbar");
  const tabline = $<HTMLButtonElement>(".hc-tabline");
  const tabFile = $<HTMLElement>(".tab-file");
  const tabToggle = $<HTMLElement>(".tab-toggle");
  const barHost = $<HTMLElement>(".hc-bar");
  const cmdNode = $<HTMLElement>(".hc-bar .cmd");
  const den = $<HTMLButtonElement>(".hc-den");
  const narrowQuery = matchMedia("(max-width: 700px)");
  const narrow = () => narrowQuery.matches;

  const entries = data.entries;
  let openEntry: Entry | null = null;
  let booted = false;
  let alive = true;
  let typingToken = 0;
  let clearTimer = 0;
  let command: string | null = null;
  let watch: Watch | null = null;
  let wheel: Wheel | null = null;
  let typingBar = false;
  let typingTerm = false;
  let archive: ReturnType<typeof createArchive> | null = null;

  const bar = createBar(barHost, root, data.visitors);
  const tips = createTips(root);
  const lightbox = createLightbox(root, { onOpen: () => tips.hide() });

  const paintKeys = () => bar.setKeys(narrow() ? (editor.classList.contains("is-tree-open") ? KEYS.touch : KEYS.closed) : matchMedia("(pointer: fine)").matches ? KEYS.wide : KEYS.touch);
  const paintTyping = () => bar.setTyping(typingBar || typingTerm);
  paintKeys();

  const terminal = createTerminal(buffer, {
    user: "harshdeep",
    host: "sec",
    lightbox,
    watch: () => watch,
    onTyping(on) {
      typingTerm = on;
      paintTyping();
    },
    mountHero: (host) => createBlueprint(host, root, data.blueprint, data.days.filter((d) => d.date >= data.blueprint.from)),
    mountArchive: (host, block) => {
      const made = createArchive(host, {
        kind: block.kind,
        cards: block.cards,
        groupBy: block.groupBy,
        viewport: buffer,
        lightbox,
        current: block.kind === "themes" ? currentPalette() : undefined,
        onPick(card) {
          if (block.kind === "themes" && card.palette) applyTheme(card.palette, true);
        },
      });
      archive = made;
      return () => {
        made.destroy();
        if (archive === made) archive = null;
      };
    },
  });

  // ------------------------------------------------------------------ theme

  function recolorAll() {
    watch?.recolor();
    wheel?.recolor();
    bar.recolor();
    terminal.recolor();
  }

  function applyTheme(name: string, announce = false) {
    if (!setPalette(name, { transition: false })) return false;
    archive?.select(currentPalette());
    if (announce) void typeCmd(`:colorscheme ${currentPalette()}`);
    return true;
  }

  const onPalette = () => requestAnimationFrame(() => alive && recolorAll());
  window.addEventListener(PALETTE_EVENT, onPalette);

  // -------------------------------------------------------------- cmd line

  function clearSoon(ms = 2400) {
    clearTimeout(clearTimer);
    clearTimer = window.setTimeout(() => {
      if (command === null && !typingBar) cmdNode.textContent = "";
    }, ms);
  }

  async function typeCmd(text: string, pace = 11) {
    const token = ++typingToken;
    clearTimeout(clearTimer);
    typingBar = true;
    barHost.classList.add("is-typing");
    paintTyping();
    try {
      if (reduced()) cmdNode.textContent = text;
      else {
        cmdNode.textContent = "";
        for (let n = 1; n <= text.length; n++) {
          if (token !== typingToken || !alive) return;
          cmdNode.textContent = text.slice(0, n);
          watch?.pressChar(text[n - 1]!);
          const rect = cmdNode.getBoundingClientRect();
          if (rect.width) watch?.focus(rect.right + 4, rect.top + rect.height / 2);
          await sleep(pace);
        }
      }
      await sleep(160);
      if (token !== typingToken) return;
      watch?.pressKey("Enter");
    } finally {
      if (token === typingToken) {
        typingBar = false;
        barHost.classList.remove("is-typing");
        paintTyping();
        clearSoon();
      }
    }
  }

  function say(text: string) {
    typingToken++;
    typingBar = false;
    barHost.classList.remove("is-typing");
    paintTyping();
    cmdNode.textContent = text;
    clearSoon(text ? 3200 : 0);
  }

  // ------------------------------------------------------------------- open

  function open(entry: Entry) {
    if (entry === openEntry) return;
    terminal.destroy();
    openEntry = entry;
    history.replaceState(null, "", `#${entry.id}`);
    buffer.scrollTop = 0;
    buffer.dataset.kind = entry.kind;
    watch?.setText(entry.text);
    bar.setView(entry.bar);
    winbar.textContent = entry.winbar;
    tabFile.textContent = entry.tab;
    terminal.show(entry.spec);
    if (entry.kind === "themes") void typeCmd(":e themes/");
  }

  function openDrawer() {
    editor.classList.add("is-tree-open");
    tabline.setAttribute("aria-expanded", "true");
    tabToggle.textContent = "↑";
    paintKeys();
    requestAnimationFrame(() => wheel?.layout());
  }

  function closeDrawer() {
    editor.classList.remove("is-tree-open");
    tabline.setAttribute("aria-expanded", "false");
    tabToggle.textContent = "↓";
    paintKeys();
  }
  const onTab = () => (editor.classList.contains("is-tree-open") ? closeDrawer() : openDrawer());
  tabline.addEventListener("click", onTab);

  function goTo(entry: Entry) {
    const k = entries.indexOf(entry);
    if (k < 0 || !wheel) return;
    wheel.select(k);
    wheel.commitNow();
    open(entry);
  }

  function findEntry(name: string) {
    const wanted = key(name.replace(/^~\/?/, ""));
    if (!wanted || ["about", "whoami", "home", "readme", "readmemd"].includes(wanted)) return entries[0];
    if (["git", "gitlog", "log", "calendar"].includes(wanted)) return entries.find((e) => e.kind === "stack");
    return entries.find((e) => key(e.id) === wanted || key(e.label) === wanted) ?? entries.find((e) => key(e.id).startsWith(wanted));
  }

  function schemes(name: string) {
    const wanted = key(name);
    if (!wanted) return [];
    if (palettes.some((p) => p.name === wanted)) return [wanted];
    return palettes.map((p) => p.name).filter((n) => n.startsWith(wanted));
  }

  function scheme(name: string) {
    const found = schemes(name);
    if (found.length === 1 && applyTheme(found[0]!)) return say(`:colorscheme ${found[0]}`);
    if (found.length > 1) return say(`E185: ${found.slice(0, 4).join(" · ")}${found.length > 4 ? " …" : ""}`);
    return say(`E185: Cannot find color scheme '${name}'`);
  }

  function run(text: string) {
    const [name = "", ...rest] = text.trim().split(/\s+/);
    const arg = rest.join(" ");
    if (!name) return say("");
    if (/^q(a|all)?!?$/.test(name) || name === "wq" || name === "x") {
      location.href = "/";
      return;
    }
    if (name === "colorscheme" || name === "colo" || name === "theme") {
      if (!arg) return name === "theme" ? goTo(entries.find((e) => e.kind === "themes")!) : say(currentPalette());
      return scheme(arg);
    }
    if (name === "e" || name === "edit" || name === "cd" || name === "open") {
      const entry = findEntry(arg);
      if (entry) {
        say("");
        return goTo(entry);
      }
      return say(`E484: Can't open file ${arg}`);
    }
    if (name === "help" || name === "h") return say(":e <entry> · :theme <name> · :q · j/k move · ↩ open");
    if (name === "resume" || name === "cv") {
      location.href = "/resume";
      return;
    }
    if (name === "blog") {
      location.href = "/blog";
      return;
    }
    const entry = !arg ? findEntry(name) : null;
    if (entry && key(name)) {
      say("");
      return goTo(entry);
    }
    if (!arg && schemes(name).length) return scheme(name);
    return say(`E492: Not an editor command: ${text.trim()}`);
  }

  function commandKey(event: KeyboardEvent) {
    event.preventDefault();
    if (event.key === "Escape") {
      command = null;
      barHost.classList.remove("is-typing");
      say("");
    } else if (event.key === "Enter") {
      const text = command ?? "";
      command = null;
      barHost.classList.remove("is-typing");
      run(text);
    } else if (event.key === "Backspace") {
      if (!command) {
        command = null;
        barHost.classList.remove("is-typing");
        say("");
        return;
      }
      command = command.slice(0, -1);
      cmdNode.textContent = `:${command}`;
    } else if (event.key.length === 1) {
      command += event.key;
      cmdNode.textContent = `:${command}`;
    }
  }

  const onKey = (event: KeyboardEvent) => {
    if (!event.repeat) watch?.pressKey(event.code, event.shiftKey);
    if (event.ctrlKey || event.metaKey || event.altKey || !booted || lightbox.isOpen) return;
    if (command !== null) return commandKey(event);
    const target = event.target instanceof Element ? event.target : null;
    if (event.key === ":") {
      event.preventDefault();
      typingToken++;
      clearTimeout(clearTimer);
      command = "";
      typingBar = false;
      barHost.classList.add("is-typing");
      cmdNode.textContent = ":";
      return;
    }
    const inBuffer = Boolean(target && (target === buffer || buffer.contains(target)));
    if (event.key === "Tab" && !event.shiftKey) {
      event.preventDefault();
      if (inBuffer) wheel?.focus();
      else buffer.focus({ preventScroll: true });
      return;
    }
    if (inBuffer) {
      if (target?.closest(".arc-card")) {
        if (event.key === "Escape") wheel?.focus();
        return;
      }
      const scroller = buffer.querySelector<HTMLElement>(".hc-arc") ?? buffer;
      const lines: Record<string, number> = { j: 13, ArrowDown: 13, k: -13, ArrowUp: -13, d: scroller.clientHeight / 2, u: -scroller.clientHeight / 2 };
      if (event.key in lines) {
        event.preventDefault();
        scroller.scrollBy({ top: lines[event.key] });
      } else if (event.key === "g") scroller.scrollTo({ top: 0 });
      else if (event.key === "G") scroller.scrollTo({ top: scroller.scrollHeight });
      else if (event.key === "ArrowLeft" || event.key === "ArrowRight") {
        event.preventDefault();
        terminal.step(event.key === "ArrowRight" ? 1 : -1);
      } else if (event.key === "Enter" && !target?.closest("button, a") && terminal.zoom()) event.preventDefault();
      else if (event.key === "h" || event.key === "Escape") wheel?.focus();
      return;
    }
    if (target?.closest("a, button:not(.hc-card)") && event.key === "Enter") return;
    if (event.key === "j" || event.key === "ArrowDown") {
      event.preventDefault();
      wheel?.step(1);
    } else if (event.key === "k" || event.key === "ArrowUp") {
      event.preventDefault();
      wheel?.step(-1);
    } else if (event.key === "l" || event.key === "ArrowRight") {
      event.preventDefault();
      terminal.step(1);
    } else if (event.key === "h" || event.key === "ArrowLeft") {
      event.preventDefault();
      terminal.step(-1);
    } else if (event.key === "g") wheel?.select(0);
    else if (event.key === "G") wheel?.select(entries.length - 1);
    else if (event.key === "Enter") {
      event.preventDefault();
      wheel?.commitNow();
      if (openEntry && (openEntry.kind === "career" || openEntry.kind === "honors" || openEntry.kind === "themes")) archive?.focus();
      else buffer.focus({ preventScroll: true });
      closeDrawer();
    } else if (event.key === "Escape") closeDrawer();
  };
  document.addEventListener("keydown", onKey);

  const onHash = () => {
    const entry = entries.find((e) => e.id === decodeURIComponent(location.hash.slice(1)));
    if (entry && entry !== openEntry) goTo(entry);
  };
  window.addEventListener("hashchange", onHash);
  const onNarrow = () => {
    closeDrawer();
    paintKeys();
  };
  narrowQuery.addEventListener("change", onNarrow);

  // Phones: fade the buffer's bottom edge while there's more below.
  let fadeFrame = 0;
  const queueFade = () => {
    if (fadeFrame) return;
    fadeFrame = requestAnimationFrame(() => {
      fadeFrame = 0;
      const rest = narrow() ? buffer.scrollHeight - buffer.clientHeight - buffer.scrollTop - parseFloat(getComputedStyle(buffer).paddingBottom) : 0;
      buffer.classList.toggle("is-cut", rest > 1);
      buffer.style.setProperty("--fade", `${Math.round(Math.min(40, Math.max(0, rest)))}px`);
    });
  };
  const fadeObserver = new MutationObserver(queueFade);
  fadeObserver.observe(buffer, { childList: true });
  buffer.addEventListener("scroll", queueFade, { passive: true });
  let fitFrame = 0;
  const onResize = () => {
    queueFade();
    if (fitFrame) return;
    fitFrame = requestAnimationFrame(() => {
      fitFrame = 0;
      terminal.refit();
    });
  };
  window.addEventListener("resize", onResize);

  // ------------------------------------------------------------------- worm

  let wormOn = false;
  try {
    wormOn = localStorage.getItem(WORM_KEY) === "on";
  } catch {}
  const paintDen = () => {
    den.setAttribute("aria-pressed", String(wormOn));
    den.dataset.tip = wormOn ? "put the worm to sleep" : "wake the worm";
  };
  paintDen();
  const onDen = () => {
    wormOn = !wormOn;
    paintDen();
    watch?.setWorm(wormOn);
    try {
      if (wormOn) localStorage.setItem(WORM_KEY, "on");
      else localStorage.removeItem(WORM_KEY);
    } catch {}
  };
  den.addEventListener("click", onDen);

  watch = createWatch({
    root,
    layer: $<HTMLCanvasElement>(".hc-overlay"),
    deskHost: $<HTMLElement>(".hc-desk"),
    eyeHost: $<HTMLElement>(".hc-eye"),
    buffer,
    status: barHost,
    den,
    wormOn,
    onState: (state) => bar.setState(state),
  });

  // ------------------------------------------------------------------- boot

  const initial = entries.find((e) => e.id === decodeURIComponent(location.hash.slice(1))) ?? entries[0]!;
  wheel = createWheel(wheelHost, {
    items: entries.map((e) => ({ id: e.id, label: e.label, src: e.src, tile: e.tile })),
    days: data.days,
    icons: data.icons,
    root,
    initial: Math.max(0, entries.indexOf(initial)),
    onChange(item) {
      tabFile.textContent = entries.find((e) => e.id === item.id)?.tab ?? `/${item.label}`;
    },
    onCommit(item) {
      if (!booted) return;
      const entry = entries.find((e) => e.id === item.id);
      if (entry) open(entry);
      const center = wheel?.centerOf();
      if (center) watch?.focus(center.x, center.y);
    },
    onPick() {
      if (!narrow()) return;
      setTimeout(() => {
        wheel?.commitNow();
        closeDrawer();
      }, reduced() ? 0 : 170);
    },
  });

  void (async () => {
    if (!reduced()) await typeCmd(":e ~/", 18);
    if (!alive) return;
    wheelHost.classList.add("is-in");
    wheel!.form();
    booted = true;
    wheel!.commitNow();
    if (!openEntry) open(entries[wheel!.current().index] ?? initial);
  })();

  return () => {
    alive = false;
    typingToken++;
    clearTimeout(clearTimer);
    cancelAnimationFrame(fadeFrame);
    cancelAnimationFrame(fitFrame);
    terminal.dispose();
    wheel?.destroy();
    watch?.destroy();
    bar.destroy();
    tips.destroy();
    lightbox.destroy();
    fadeObserver.disconnect();
    document.removeEventListener("keydown", onKey);
    window.removeEventListener("hashchange", onHash);
    window.removeEventListener("resize", onResize);
    window.removeEventListener(PALETTE_EVENT, onPalette);
    narrowQuery.removeEventListener("change", onNarrow);
    tabline.removeEventListener("click", onTab);
    den.removeEventListener("click", onDen);
  };
}
