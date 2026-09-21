"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { CaretDown, MagnifyingGlass } from "@phosphor-icons/react";
import { useEffect, useRef, useState } from "react";
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
        className="inline-flex items-center gap-1 text-sm text-secondary transition-colors duration-200 hover:text-foreground"
        aria-expanded={open}
        aria-haspopup="menu"
      >
        More
        <CaretDown
          className={cn("size-3.5 transition-transform", open && "rotate-180")}
        />
      </button>

      {open && (
        <div className="absolute right-0 top-[calc(100%+0.5rem)] z-50 min-w-[10rem] rounded-xl border border-border bg-card p-1.5 shadow-lg">
          {moreNav.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              onClick={() => setOpen(false)}
              className="block rounded-lg px-3 py-2 text-sm text-secondary transition-colors hover:bg-muted hover:text-foreground"
            >
              {item.label}
            </Link>
          ))}
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
    <header className="sticky top-0 z-50 w-full animate-in fade-in slide-in-from-top-2 border-b border-border/50 bg-background/75 backdrop-blur-md duration-500">
      <div className="container mx-auto flex h-14 max-w-3xl items-center justify-between gap-2 px-4 sm:grid sm:grid-cols-[1fr_auto_1fr] sm:gap-4 sm:px-6">
        <Link
          href="/"
          className="justify-self-start font-mono text-lg font-bold tracking-tight text-foreground transition-transform duration-300 hover:scale-110 active:scale-95"
        >
          HA
        </Link>

        <nav className="flex items-center justify-center gap-3 text-sm font-medium sm:gap-5">
          {headerNav.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "relative py-1 transition-colors duration-200 hover:text-foreground",
                // Slide-in underline (transform-only = GPU-cheap).
                "after:pointer-events-none after:absolute after:inset-x-0 after:-bottom-0.5 after:h-0.5 after:origin-left after:rounded-full after:bg-foreground after:transition-transform after:duration-300 hover:after:scale-x-100",
                pathname === item.href
                  ? "font-semibold text-foreground after:scale-x-100"
                  : "text-secondary after:scale-x-0",
              )}
            >
              {item.label}
            </Link>
          ))}
          <MoreMenu />
        </nav>

        <div className="flex items-center justify-end gap-3 sm:gap-4">
          <button
            type="button"
            onClick={openCommand}
            aria-label="Open command palette"
            className="hidden h-8 items-center gap-2 rounded-full border border-border bg-card/80 px-3 text-sm text-secondary shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:border-foreground/20 hover:text-foreground hover:shadow-md active:translate-y-0 active:scale-95 sm:inline-flex"
          >
            <MagnifyingGlass className="size-4" weight="bold" />
            <span className="hidden items-center gap-1 sm:inline-flex">
              <kbd className="inline-flex h-5 min-w-5 items-center justify-center rounded border border-border bg-muted px-1 font-mono text-[10px]">
                ⌘
              </kbd>
              <kbd className="inline-flex h-5 min-w-5 items-center justify-center rounded border border-border bg-muted px-1 font-mono text-[10px]">
                K
              </kbd>
            </span>
          </button>

          <div className="hidden h-4 w-px bg-border sm:block" />

          <ThemeToggle />
        </div>
      </div>
    </header>
  );
}
