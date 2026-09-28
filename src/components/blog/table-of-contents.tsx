"use client";

import { useEffect, useState } from "react";
import type { Heading } from "@/lib/headings";
import { cn } from "@/lib/utils";

/** "On this page" list that highlights the section currently being read. */
export function TableOfContents({ headings }: { headings: Heading[] }) {
  const [active, setActive] = useState(headings[0]?.id ?? "");

  useEffect(() => {
    const elements = headings
      .map((heading) => document.getElementById(heading.id))
      .filter((el): el is HTMLElement => Boolean(el));

    const update = () => {
      // The last heading scrolled past the top third of the screen is active.
      const line = window.innerHeight * 0.3;
      let current = elements[0]?.id ?? "";
      for (const el of elements) {
        if (el.getBoundingClientRect().top <= line) current = el.id;
      }
      setActive(current);
    };

    update();
    window.addEventListener("scroll", update, { passive: true });
    return () => window.removeEventListener("scroll", update);
  }, [headings]);

  return (
    <nav aria-label="On this page">
      <p className="font-mono text-[10px] uppercase tracking-[0.15em] text-secondary">
        On this page
      </p>
      <ol className="mt-3 space-y-2 border-l border-border">
        {headings.map((heading) => (
          <li key={heading.id}>
            <a
              href={`#${heading.id}`}
              aria-current={active === heading.id ? "location" : undefined}
              className={cn(
                "-ml-px block border-l pl-3 text-xs leading-snug transition-colors",
                active === heading.id
                  ? "border-sage text-foreground"
                  : "border-transparent text-secondary hover:text-foreground",
              )}
            >
              {heading.text}
            </a>
          </li>
        ))}
      </ol>
    </nav>
  );
}
