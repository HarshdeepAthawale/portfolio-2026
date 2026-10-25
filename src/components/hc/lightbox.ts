import { make, narrow, reduced } from "./util";

/**
 * A zoom-from-the-thumbnail lightbox: the stage starts exactly over the source
 * frame and scales up to fill the viewport, then flies back on close.
 */

const EASE = "cubic-bezier(0.23, 1, 0.32, 1)";
const MS = { open: 240, close: 200 };
const SVG = "http://www.w3.org/2000/svg";
const CORNERS = "M1 5V1h4M9 1h4v4M13 9v4H9M5 13H1V9";

/** The small "view large" corner button shown on hover. */
export function zoomButton(cls: string) {
  const button = make("button", cls);
  button.type = "button";
  button.setAttribute("aria-label", "view large");
  button.dataset.tip = "view large";
  const svg = document.createElementNS(SVG, "svg");
  svg.setAttribute("viewBox", "0 0 14 14");
  svg.setAttribute("aria-hidden", "true");
  const path = document.createElementNS(SVG, "path");
  path.setAttribute("d", CORNERS);
  svg.append(path);
  button.append(svg);
  button.addEventListener("pointerdown", (event) => event.stopPropagation());
  return button;
}

export type LightboxItem = { src: string; alt: string; left: [string, string?][]; right: string[] };

type OpenArgs = {
  items: LightboxItem[];
  index: number;
  from: (k: number) => DOMRect | null;
  onStep?: (k: number) => void;
  onClose?: (k: number) => void;
};

export function createLightbox(host: HTMLElement, { onOpen }: { onOpen?: () => void } = {}) {
  const root = make("div", "hc-lb");
  root.hidden = true;
  root.tabIndex = -1;
  root.setAttribute("role", "dialog");
  root.setAttribute("aria-modal", "true");
  root.setAttribute("aria-label", "Image viewer");
  const back = make("div", "hc-lb-back");
  const stage = make("div", "hc-lb-stage");
  const img = make("img", "hc-lb-img");
  img.alt = "";
  img.draggable = false;
  stage.append(img);
  const cap = make("p", "hc-lb-cap");
  const left = make("span");
  const right = make("span");
  cap.append(left, right);
  root.append(back, stage, cap);
  host.append(root);

  let s: (OpenArgs & { at: number; ratio: number; box: { x: number; y: number; w: number; h: number } | null }) | null = null;
  let returnFocus: HTMLElement | null = null;
  let touch: { x: number; y: number } | null = null;

  function target(ratio: number) {
    const pad = narrow() ? 16 : 48;
    const top = 40;
    const w = innerWidth - pad * 2;
    const h = innerHeight - top * 2;
    const scale = Math.min(w / ratio, h);
    const bw = scale * ratio;
    const bh = scale;
    return { x: (innerWidth - bw) / 2, y: (innerHeight - bh) / 2, w: bw, h: bh };
  }

  function paintCaption() {
    if (!s) return;
    const item = s.items[s.at]!;
    left.replaceChildren(
      ...item.left.map(([text, cls]) => {
        if (cls === "b") return make("b", undefined, text);
        return document.createTextNode(text);
      }),
    );
    right.textContent = item.right.join(" · ");
  }

  function place(animateFrom: DOMRect | null) {
    if (!s) return;
    const box = target(s.ratio);
    s.box = box;
    stage.style.width = `${box.w}px`;
    stage.style.height = `${box.h}px`;
    cap.style.width = `${box.w}px`;
    cap.style.transform = `translate(${Math.round(box.x)}px, ${Math.round(box.y - 18)}px)`;
    if (animateFrom && !reduced()) {
      const sx = animateFrom.width / box.w;
      const sy = animateFrom.height / box.h;
      stage.style.transition = "none";
      stage.style.transform = `translate(${animateFrom.left}px, ${animateFrom.top}px) scale(${sx}, ${sy})`;
      void stage.offsetWidth;
      stage.style.transition = `transform ${MS.open}ms ${EASE}`;
    } else stage.style.transition = "none";
    stage.style.transform = `translate(${box.x}px, ${box.y}px)`;
  }

  function show(k: number, from: DOMRect | null) {
    if (!s) return;
    s.at = k;
    const item = s.items[k]!;
    img.alt = item.alt;
    const apply = () => {
      if (!s || s.at !== k) return;
      s.ratio = img.naturalWidth && img.naturalHeight ? img.naturalWidth / img.naturalHeight : 16 / 9;
      place(from);
    };
    img.onload = apply;
    img.src = item.src;
    if (img.complete && img.naturalWidth) apply();
    paintCaption();
  }

  function step(delta: number) {
    if (!s || s.items.length < 2) return;
    const n = s.items.length;
    const k = (((s.at + delta) % n) + n) % n;
    show(k, null);
    s.onStep?.(k);
  }

  function close(instant = false) {
    if (!s) return;
    const done = s;
    s = null;
    const from = done.from(done.at);
    const finish = () => {
      root.hidden = true;
      stage.style.transition = "none";
      done.onClose?.(done.at);
      returnFocus?.focus({ preventScroll: true });
    };
    if (instant || reduced() || !from || !done.box) {
      finish();
      return;
    }
    stage.style.transition = `transform ${MS.close}ms ${EASE}`;
    stage.style.transform = `translate(${from.left}px, ${from.top}px) scale(${from.width / done.box.w}, ${from.height / done.box.h})`;
    root.style.transition = `opacity ${MS.close}ms ${EASE}`;
    root.style.opacity = "0";
    window.setTimeout(() => {
      root.style.opacity = "";
      root.style.transition = "";
      finish();
    }, MS.close);
  }

  const onKey = (event: KeyboardEvent) => {
    if (!s) return;
    if (event.key === "Escape" || event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      event.stopPropagation();
      close();
    } else if (event.key === "ArrowRight" || event.key === "l") {
      event.preventDefault();
      event.stopPropagation();
      step(1);
    } else if (event.key === "ArrowLeft" || event.key === "h") {
      event.preventDefault();
      event.stopPropagation();
      step(-1);
    }
  };
  root.addEventListener("keydown", onKey);
  let swiped = false;
  root.addEventListener("click", () => {
    if (swiped) swiped = false;
    else close();
  });
  root.addEventListener("pointerdown", (event) => {
    if (event.pointerType !== "mouse") touch = { x: event.clientX, y: event.clientY };
  });
  root.addEventListener("pointerup", (event) => {
    if (!touch) return;
    const dx = event.clientX - touch.x;
    touch = null;
    if (Math.abs(dx) > 40) {
      swiped = true;
      step(dx < 0 ? 1 : -1);
    }
  });
  const onResize = () => {
    if (s) place(null);
  };
  window.addEventListener("resize", onResize);

  return {
    open(args: OpenArgs) {
      returnFocus = document.activeElement as HTMLElement | null;
      s = { ...args, at: args.index, ratio: 16 / 9, box: null };
      root.hidden = false;
      onOpen?.();
      show(args.index, args.from(args.index));
      root.focus({ preventScroll: true });
    },
    close,
    get isOpen() {
      return Boolean(s);
    },
    destroy() {
      window.removeEventListener("resize", onResize);
      root.remove();
    },
  };
}

export type Lightbox = ReturnType<typeof createLightbox>;
