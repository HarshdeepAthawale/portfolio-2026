"use client";

import { useEffect, useRef } from "react";

/** Thin sun bar across the top of the page that fills as the article is read. */
export function ReadingProgress({ targetId }: { targetId: string }) {
  const bar = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const article = document.getElementById(targetId);
    const scroller = article?.closest<HTMLElement>(".mc-reading-scroll");
    const update = () => {
      const article = document.getElementById(targetId);
      if (!article || !bar.current) return;
      const rect = article.getBoundingClientRect();
      const viewport = scroller?.clientHeight ?? window.innerHeight;
      const top = scroller?.getBoundingClientRect().top ?? 0;
      const total = rect.height - viewport;
      const progress = total <= 0 ? 1 : Math.min(Math.max((top - rect.top) / total, 0), 1);
      bar.current.style.transform = `scaleX(${progress})`;
    };

    update();
    const scrollTarget = scroller ?? window;
    scrollTarget.addEventListener("scroll", update, { passive: true });
    window.addEventListener("resize", update);
    return () => {
      scrollTarget.removeEventListener("scroll", update);
      window.removeEventListener("resize", update);
    };
  }, [targetId]);

  return (
    <div
      ref={bar}
      aria-hidden
      className="fixed inset-x-0 top-0 z-[60] h-0.5 origin-left scale-x-0 bg-sun"
    />
  );
}
