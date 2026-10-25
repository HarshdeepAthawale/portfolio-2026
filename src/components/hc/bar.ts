import { fmt, make, narrow, readColors, type Colors } from "./util";

/**
 * The status bar under the editor: owner and command line on the left, the
 * open entry's numbers, what the worm / eye / ghost are up to, and a bar
 * chart of visitors per day.
 */

export type BarState = {
  worm: { text: string; hot: boolean; label: string | null };
  eye: { text: string; hot: boolean };
  ghost: "idle" | "repairing";
};

export function createBar(host: HTMLElement, root: HTMLElement, visitors: { total: number | null; days: number[]; since: string | null }) {
  const cols = host.querySelector<HTMLElement>(".bar-cols")!;
  const values = Object.fromEntries([...host.querySelectorAll<HTMLElement>("[data-k]")].map((node) => [node.dataset.k!, node]));
  const hunt = host.querySelector<HTMLElement>(".hunt")!;
  const keys = host.querySelector<HTMLElement>(".keys")!;
  const graph = host.querySelector<HTMLElement>(".bar-graph")!;
  const den = host.querySelector<HTMLElement>(".hc-den");
  const canvas = graph.querySelector("canvas")!;
  const span = graph.querySelector<HTMLElement>(".span")!;
  const end = graph.querySelector<HTMLElement>(".end")!;
  const g = canvas.getContext("2d")!;
  let typing = false;
  let repairing = false;
  let colors: Colors | null = null;

  function paintGhost() {
    const ghost = values.ghost!;
    ghost.textContent = typing ? "typing" : repairing ? "repairing" : "idle";
    ghost.classList.toggle("is-hot", typing || repairing);
  }

  function draw() {
    if (!colors) return;
    const n = narrow() ? 28 : 56;
    const days = visitors.days.slice(-n);
    const w = n * 3 - 1;
    const h = 15;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = Math.round(w * dpr);
    canvas.height = Math.round(h * dpr);
    canvas.style.width = `${w}px`;
    canvas.style.height = `${h}px`;
    g.setTransform(dpr, 0, 0, dpr, 0, 0);
    g.clearRect(0, 0, w, h);
    const top = Math.max(1, ...days);
    const shift = n - days.length;
    const first = days.findIndex((count) => count >= 0);
    // A dotted rule marks where counting began.
    if (first > 0) {
      g.fillStyle = `rgba(${colors.dim}, 0.55)`;
      for (let y = 0; y < h; y += 2) g.fillRect((shift + first) * 3 - 2, y, 1, 1);
    }
    days.forEach((count, k) => {
      if (count < 0) return;
      const bar = 1 + (h - 1) * Math.min(1, count / top);
      g.fillStyle = k === days.length - 1 ? `rgba(${colors!.accent}, 0.95)` : `rgba(${colors!.dim}, 0.75)`;
      g.fillRect((shift + k) * 3, h - bar, 2, bar);
    });
    span.textContent = narrow() ? "VISITORS" : `VISITORS · ${n} D`;
    end.textContent = visitors.total != null ? fmt(visitors.total) : "";
  }

  graph.dataset.tip = `visitors per day${visitors.total != null ? ` · ${fmt(visitors.total)} all time` : ""}${visitors.since ? ` · since ${visitors.since.slice(5)}` : ""}\nno cookies · no stored IPs`;
  const onNarrow = () => draw();
  const narrowQuery = matchMedia("(max-width: 700px)");
  narrowQuery.addEventListener("change", onNarrow);
  const observer = den ? new ResizeObserver(() => (den.style.right = `${graph.offsetWidth + 2}px`)) : null;
  observer?.observe(graph);

  const bar = {
    setView(list: [string, string][]) {
      cols.replaceChildren(
        ...list.map(([name, value]) => {
          const col = make("p", "col");
          col.append(make("span", "label", name), make("span", "value", value));
          return col;
        }),
      );
    },
    setState({ worm, eye, ghost }: BarState) {
      values.worm!.textContent = worm.text;
      values.worm!.classList.toggle("is-hot", worm.hot);
      values.eye!.textContent = eye.text;
      values.eye!.classList.toggle("is-hot", eye.hot);
      hunt.textContent = worm.label ?? "";
      repairing = ghost === "repairing";
      paintGhost();
    },
    setTyping(on: boolean) {
      typing = on;
      paintGhost();
    },
    setKeys(text: string) {
      keys.textContent = text;
    },
    recolor() {
      colors = readColors(root);
      draw();
    },
    destroy() {
      narrowQuery.removeEventListener("change", onNarrow);
      observer?.disconnect();
    },
  };
  bar.recolor();
  paintGhost();
  return bar;
}

export type Bar = ReturnType<typeof createBar>;

/** One shared tooltip for every [data-tip] element under `root`. */
export function createTips(root: HTMLElement) {
  const tip = make("div", "hc-tip");
  tip.setAttribute("role", "tooltip");
  tip.hidden = true;
  root.append(tip);
  let current: Element | null = null;
  let timer = 0;

  function hide() {
    clearTimeout(timer);
    current = null;
    tip.hidden = true;
  }

  function show(target: HTMLElement | SVGElement) {
    const text = target.dataset.tip;
    if (!text) {
      hide();
      return;
    }
    current = target;
    tip.textContent = text;
    tip.hidden = false;
    const box = target.getBoundingClientRect();
    const w = tip.offsetWidth;
    const h = tip.offsetHeight;
    const x = Math.max(6, Math.min(innerWidth - w - 6, box.left + box.width / 2 - w / 2));
    const y = box.top - h - 6 < 6 ? box.bottom + 6 : box.top - h - 6;
    tip.style.transform = `translate(${Math.round(x)}px, ${Math.round(y)}px)`;
  }

  const onOver = (event: PointerEvent) => {
    const target = event.target instanceof Element ? (event.target.closest("[data-tip]") as HTMLElement | null) : null;
    if (target && root.contains(target)) {
      show(target);
      clearTimeout(timer);
      if (event.pointerType !== "mouse") timer = window.setTimeout(hide, 2500);
    } else if (current) hide();
  };
  const onOut = (event: PointerEvent) => {
    if (event.pointerType !== "mouse") return;
    if (current && !(event.relatedTarget instanceof Node && current.contains(event.relatedTarget))) hide();
  };
  const onDown = (event: PointerEvent) => {
    if (current && !(event.target instanceof Node && current.contains(event.target))) hide();
  };
  document.addEventListener("pointerover", onOver);
  document.addEventListener("pointerout", onOut);
  document.addEventListener("pointerdown", onDown);
  addEventListener("scroll", hide, { capture: true, passive: true });
  return {
    hide,
    destroy() {
      document.removeEventListener("pointerover", onOver);
      document.removeEventListener("pointerout", onOut);
      document.removeEventListener("pointerdown", onDown);
      removeEventListener("scroll", hide, { capture: true });
      tip.remove();
    },
  };
}
