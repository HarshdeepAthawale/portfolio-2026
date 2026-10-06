"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { CaretDown, MagnifyingGlass } from "@phosphor-icons/react";
import { useEffect, useRef, useState } from "react";
import { heroConfig } from "@/config/hero";
import { headerNav, moreNav } from "@/config/navigation";
import { cn } from "@/lib/utils";
import { ThemeToggle } from "@/components/theme-toggle";

function MoreMenu() {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const onClick = (event: MouseEvent) => {
      if (ref.current && !ref.current.contains(event.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, []);

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        className="inline-flex items-center gap-1 text-sm text-foreground opacity-75 transition-opacity duration-200 hover:opacity-100"
        aria-expanded={open}
        aria-haspopup="menu"
      >
        More
        <CaretDown
          className={cn("size-3.5 transition-transform", open && "rotate-180")}
        />
      </button>

      {open && (
        <div className="absolute right-0 top-[calc(100%+0.5rem)] z-50 min-w-[10rem] rounded-sm border border-border bg-card p-1 shadow-lg">
          {moreNav.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              onClick={() => setOpen(false)}
              className="block rounded-sm px-3 py-2 text-sm text-secondary transition-colors hover:bg-muted hover:text-foreground"
            >
              {item.label}
            </Link>
          ))}
          <button
            type="button"
            onClick={() => {
              setOpen(false);
              document.dispatchEvent(new CustomEvent("open-command-menu"));
            }}
            className="mt-1 block w-full rounded-sm border-t border-border px-3 py-2 text-left text-sm text-secondary transition-colors hover:bg-muted hover:text-foreground"
          >
            Search
          </button>
        </div>
      )}
    </div>
  );
}

export function SiteHeader() {
  const pathname = usePathname();

  const openCommand = () => {
    document.dispatchEvent(new CustomEvent("open-command-menu"));
  };

  return (
    <header style={{ viewTransitionName: "site-header" }} className="sticky top-0 z-50 w-full animate-in fade-in slide-in-from-top-2 border-b border-border bg-background/85 backdrop-blur-md duration-500">
      <div className="container mx-auto flex h-16 max-w-3xl items-center justify-between gap-3 px-4 sm:gap-6 sm:px-6">
        <Link
          href="/"
          className="shrink-0 font-display text-xl font-medium text-foreground transition-opacity hover:opacity-75"
        >
          <span className="sm:hidden">HA</span>
          <span className="hidden sm:inline">harshdeep</span>
        </Link>

        <nav className="flex items-center gap-3 text-sm font-medium sm:mr-auto sm:gap-6">
          {headerNav.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "relative py-1 text-foreground transition-opacity duration-200 hover:opacity-100",
                // Slide-in underline in the accent (transform-only = GPU-cheap).
                "after:pointer-events-none after:absolute after:inset-x-0 after:-bottom-1 after:h-px after:origin-left after:bg-sun after:transition-transform after:duration-300 hover:after:scale-x-100",
                pathname === item.href ? "after:scale-x-100" : "opacity-75 after:scale-x-0",
              )}
            >
              {item.label}
            </Link>
          ))}
          <MoreMenu />
        </nav>

        <div className="flex items-center gap-2 sm:gap-3">
          <button
            type="button"
            onClick={openCommand}
            aria-label="Open command palette"
            className="hidden size-8 items-center justify-center rounded-sm border border-border text-secondary transition-colors duration-200 hover:border-foreground/30 hover:text-foreground sm:inline-flex"
          >
            <MagnifyingGlass className="size-4" weight="bold" />
          </button>
          <ThemeToggle />
          <a
            href={`mailto:${heroConfig.email}`}
            className="hidden h-9 items-center rounded-sm border border-foreground/25 px-3.5 text-sm font-medium text-foreground transition-colors hover:bg-foreground hover:text-background md:inline-flex"
          >
            Get in touch
          </a>
        </div>
      </div>
    </header>
  );
}
