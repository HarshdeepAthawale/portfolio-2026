"use client";

import { usePathname } from "next/navigation";
import { useEffect } from "react";

/**
 * Turns every `.animate-in-up-on-view` element into a scroll-triggered reveal:
 * elements start hidden (gated by the `.reveal-enabled` class on <html>, set by
 * an inline script in the layout) and play their fade-in-up as they enter the
 * viewport. Re-scans on route change since the layout — and this component —
 * persist across client navigation.
 */
export function ScrollReveal() {
  const pathname = usePathname();

  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    const els = Array.from(
      document.querySelectorAll<HTMLElement>(
        ".animate-in-up-on-view:not(.reveal-in)",
      ),
    );
    if (els.length === 0) return;

    // No IntersectionObserver (very old browser) → just show everything.
    if (!("IntersectionObserver" in window)) {
      els.forEach((el) => el.classList.add("reveal-in"));
      return;
    }

    const io = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            entry.target.classList.add("reveal-in");
            io.unobserve(entry.target);
          }
        }
      },
      { rootMargin: "0px 0px -8% 0px", threshold: 0.08 },
    );

    els.forEach((el) => {
      // Anything already on screen reveals immediately; the rest wait for scroll.
      if (el.getBoundingClientRect().top < window.innerHeight * 0.95) {
        el.classList.add("reveal-in");
      } else {
        io.observe(el);
      }
    });

    return () => io.disconnect();
  }, [pathname]);

  return null;
}
