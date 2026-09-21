"use client";

import { useTheme } from "next-themes";
import { Moon, Sun } from "@phosphor-icons/react";
import { useEffect, useRef, useState } from "react";
import { flushSync } from "react-dom";
import { playThemeClickSound } from "@/lib/theme-click-sound";
import { cn } from "@/lib/utils";

export function ThemeToggle({ className }: { className?: string }) {
  const { resolvedTheme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  const buttonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => setMounted(true), []);

  const toggleTheme = async () => {
    playThemeClickSound();
    const next = resolvedTheme === "dark" ? "light" : "dark";

    const doc = document as Document & {
      startViewTransition?: (cb: () => void) => { ready: Promise<void> };
    };
    const prefersReduced =
      typeof window !== "undefined" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    // No View Transitions support (Firefox/Safari older) or reduced motion:
    // switch instantly, no animation.
    if (!doc.startViewTransition || prefersReduced) {
      setTheme(next);
      return;
    }

    // Grow the reveal circle from the center of the toggle button, out to the
    // farthest corner so it always covers the whole viewport.
    const rect = buttonRef.current?.getBoundingClientRect();
    const x = rect ? rect.left + rect.width / 2 : window.innerWidth / 2;
    const y = rect ? rect.top + rect.height / 2 : window.innerHeight / 2;
    const endRadius = Math.hypot(
      Math.max(x, window.innerWidth - x),
      Math.max(y, window.innerHeight - y),
    );

    const transition = doc.startViewTransition(() => {
      // Apply the theme class to <html> synchronously so the *new* snapshot is
      // captured with the new colors. next-themes applies the class in a passive
      // effect, which runs too late for the view-transition snapshot — so we set
      // it here and let setTheme keep state/localStorage in sync.
      const root = document.documentElement;
      root.classList.remove("light", "dark");
      root.classList.add(next);
      root.style.colorScheme = next;
      flushSync(() => setTheme(next));
    });

    try {
      await transition.ready;
      document.documentElement.animate(
        {
          clipPath: [
            `circle(0px at ${x}px ${y}px)`,
            `circle(${endRadius}px at ${x}px ${y}px)`,
          ],
        },
        {
          duration: 550,
          easing: "cubic-bezier(0.4, 0, 0.2, 1)",
          pseudoElement: "::view-transition-new(root)",
        },
      );
    } catch {
      // A rapid re-toggle skips the in-flight transition and rejects `ready`.
      // The theme is already applied, so there's nothing else to do.
    }
  };

  if (!mounted) {
    return <span className={cn("inline-flex size-8 items-center justify-center", className)} />;
  }

  return (
    <button
      ref={buttonRef}
      type="button"
      aria-label="Toggle theme"
      onClick={toggleTheme}
      className={cn(
        "inline-flex size-8 items-center justify-center rounded-md text-muted-foreground transition-colors hover:text-primary active:scale-95",
        className,
      )}
    >
      {resolvedTheme === "dark" ? <Sun className="size-4" /> : <Moon className="size-4" />}
    </button>
  );
}
