"use client";

import { DEFAULT_PALETTE, getPalette, PALETTE_KEY, palettes } from "@/config/palettes";

export const PALETTE_EVENT = "palettechange";

export function currentPalette() {
  if (typeof document === "undefined") return DEFAULT_PALETTE;
  return document.documentElement.dataset.palette || DEFAULT_PALETTE;
}

/**
 * Applies a palette site-wide and remembers it. Returns false for unknown names.
 * `transition: false` skips the view-transition cross-fade and applies at once
 * (the terminal pages fade their own colours and repaint canvases right away).
 */
export function setPalette(name: string, { transition = true }: { transition?: boolean } = {}) {
  const palette = palettes.find((p) => p.name === name.toLowerCase().replace(/[^a-z]/g, ""));
  if (!palette) return false;
  const root = document.documentElement;
  const apply = () => {
    root.dataset.palette = palette.name;
    root.classList.toggle("dark", !palette.light);
    root.classList.toggle("light", palette.light);
  };
  const doc = document as Document & { startViewTransition?: (cb: () => void) => unknown };
  // A quick cross-fade when supported; instant otherwise.
  if (transition && doc.startViewTransition && !matchMedia("(prefers-reduced-motion: reduce)").matches) {
    root.dataset.vt = "theme";
    const t = doc.startViewTransition(apply) as { finished?: Promise<void> };
    t.finished?.finally(() => delete root.dataset.vt);
  } else {
    apply();
  }
  try {
    localStorage.setItem(PALETTE_KEY, palette.name);
  } catch {}
  window.dispatchEvent(new CustomEvent(PALETTE_EVENT, { detail: palette.name }));
  return true;
}

export function cyclePalette(step = 1) {
  const names = palettes.map((p) => p.name);
  const index = names.indexOf(getPalette(currentPalette()).name);
  const next = names[(index + step + names.length) % names.length]!;
  setPalette(next);
  return next;
}
