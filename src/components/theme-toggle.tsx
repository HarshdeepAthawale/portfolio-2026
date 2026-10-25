"use client";

import { useEffect, useState } from "react";
import { currentPalette, cyclePalette, PALETTE_EVENT } from "@/lib/palette-client";
import { playThemeClickSound } from "@/lib/theme-click-sound";
import { cn } from "@/lib/utils";

/** `:theme` key: cycles the terminal palettes (shift+click goes backwards). */
export function ThemeToggle({ className }: { className?: string }) {
  const [name, setName] = useState<string | null>(null);

  useEffect(() => {
    setName(currentPalette());
    const onChange = (event: Event) => setName((event as CustomEvent<string>).detail);
    window.addEventListener(PALETTE_EVENT, onChange);
    return () => window.removeEventListener(PALETTE_EVENT, onChange);
  }, []);

  return (
    <button
      type="button"
      onClick={(event) => {
        playThemeClickSound();
        cyclePalette(event.shiftKey ? -1 : 1);
      }}
      aria-label={name ? `Theme: ${name}. Change theme` : "Change theme"}
      title="Change theme (shift: previous)"
      className={cn(
        "inline-flex h-9 items-center gap-1.5 rounded-sm px-2 font-mono text-xs text-secondary transition-colors hover:text-foreground",
        className,
      )}
    >
      <span aria-hidden className="text-sun">
        ❯
      </span>
      :theme
      {name && <span className="hidden text-foreground/40 sm:inline">{name}</span>}
    </button>
  );
}
