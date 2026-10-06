"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ArrowUpRight, CaretDown, MagnifyingGlass } from "@phosphor-icons/react";
import { useEffect, useRef, useState } from "react";
import { heroConfig, socialLinks } from "@/config/hero";
import { headerNav, moreNav } from "@/config/navigation";
import { cn } from "@/lib/utils";
import { ThemeToggle } from "@/components/theme-toggle";

const openSearch = () => document.dispatchEvent(new CustomEvent("open-command-menu"));

function isActive(pathname: string, href: string) {
  return pathname === href || pathname.startsWith(`${href}/`);
}

/** A small security reticle: the site's mark. */
function LogoMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden className={className}>
      <circle cx="12" cy="12" r="8" stroke="currentColor" strokeWidth="1.4" />
      <path d="M12 1.5v5M12 17.5v5M1.5 12h5M17.5 12h5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
      <circle cx="12" cy="12" r="1.9" className="fill-sun" />
    </svg>
  );
}

function MoreMenu({ pathname }: { pathname: string }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const button = useRef<HTMLButtonElement>(null);
  const active = moreNav.some((item) => isActive(pathname, item.href));

  // Close on outside click, Escape, and navigation.
  useEffect(() => {
    if (!open) return;
    const onPointer = (event: PointerEvent) => {
      if (ref.current && !ref.current.contains(event.target as Node)) setOpen(false);
    };
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setOpen(false);
        button.current?.focus();
      }
    };
    document.addEventListener("pointerdown", onPointer);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("pointerdown", onPointer);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  useEffect(() => setOpen(false), [pathname]);

  return (
    <div ref={ref} className="relative">
      <button
        ref={button}
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        className={cn(
          "inline-flex items-center gap-1 py-1 text-sm font-medium text-foreground transition-opacity hover:opacity-100",
          active || open ? "opacity-100" : "opacity-70",
        )}
        aria-expanded={open}
        aria-controls="more-menu"
      >
        More
        <CaretDown className={cn("size-3.5 transition-transform duration-200", open && "rotate-180")} />
      </button>

      {open && (
        <div
          id="more-menu"
          className="absolute left-1/2 top-[calc(100%+0.9rem)] z-50 w-64 -translate-x-1/2 animate-in fade-in slide-in-from-top-1 border border-border bg-card p-1.5 shadow-lg duration-150"
        >
          <p className="px-3 pb-1 pt-2 font-mono text-[10px] uppercase tracking-[0.18em] text-secondary">
            More pages
          </p>
          {moreNav.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              aria-current={isActive(pathname, item.href) ? "page" : undefined}
              className="group flex items-baseline justify-between gap-3 rounded-sm px-3 py-2 transition-colors hover:bg-muted"
            >
              <span className="text-sm font-medium text-foreground group-aria-[current=page]:text-sun">
                {item.label}
              </span>
              <span className="text-xs text-secondary">{item.note}</span>
            </Link>
          ))}
          <button
            type="button"
            onClick={() => {
              setOpen(false);
              openSearch();
            }}
            className="mt-1 flex w-full items-center justify-between rounded-sm border-t border-border px-3 py-2 text-sm text-secondary transition-colors hover:bg-muted hover:text-foreground"
          >
            Search everything
            <kbd className="font-mono text-[10px] uppercase tracking-[0.1em]">Ctrl K</kbd>
          </button>
        </div>
      )}
    </div>
  );
}

/** Full-screen menu for phones and small tablets. */
function MobileMenu({
  open,
  onClose,
  pathname,
}: {
  open: boolean;
  onClose: () => void;
  pathname: string;
}) {
  const firstLink = useRef<HTMLAnchorElement>(null);

  useEffect(() => {
    if (!open) return;
    firstLink.current?.focus();
    const overflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (event: KeyboardEvent) => event.key === "Escape" && onClose();
    document.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = overflow;
      document.removeEventListener("keydown", onKey);
    };
  }, [open, onClose]);

  if (!open) return null;

  const links = [{ label: "Home", href: "/" }, ...headerNav, ...moreNav];

  return (
    <div
      id="mobile-menu"
      className="fixed inset-x-0 bottom-0 top-16 z-40 animate-in fade-in slide-in-from-top-2 overflow-y-auto bg-background duration-200 md:hidden"
    >
      <nav aria-label="Site" className="container mx-auto max-w-3xl px-5 pb-10 pt-6 sm:px-6">
        <ol className="divide-y divide-border border-y border-border">
          {links.map((item, index) => {
            const current = item.href === "/" ? pathname === "/" : isActive(pathname, item.href);
            return (
              <li key={item.href}>
                <Link
                  ref={index === 0 ? firstLink : undefined}
                  href={item.href}
                  onClick={onClose}
                  aria-current={current ? "page" : undefined}
                  className="flex items-baseline gap-4 py-3.5"
                >
                  <span className="w-7 font-mono text-[11px] text-foreground/40">
                    {String(index + 1).padStart(2, "0")}
                  </span>
                  <span className={cn("font-display text-3xl", current ? "text-sun" : "text-foreground")}>
                    {item.label}
                  </span>
                </Link>
              </li>
            );
          })}
        </ol>

        <div className="mt-8 flex flex-wrap items-center gap-3">
          <a
            href={`mailto:${heroConfig.email}`}
            className="inline-flex h-10 items-center rounded-sm bg-foreground px-5 text-sm font-medium text-background"
          >
            Get in touch
          </a>
          <button
            type="button"
            onClick={() => {
              onClose();
              openSearch();
            }}
            className="inline-flex h-10 items-center gap-2 rounded-sm border border-border px-4 text-sm"
          >
            <MagnifyingGlass className="size-4" />
            Search
          </button>
        </div>

        <p className="mt-10 font-mono text-[10px] uppercase tracking-[0.18em] text-secondary">Connect</p>
        <ul className="mt-3 flex flex-wrap gap-x-5 gap-y-2">
          {socialLinks.map((link) => (
            <li key={link.name}>
              <a
                href={link.href}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 text-sm text-foreground/85"
              >
                {link.name}
                <ArrowUpRight className="size-3.5 text-foreground/40" />
              </a>
            </li>
          ))}
        </ul>
      </nav>
    </div>
  );
}

export function SiteHeader() {
  const pathname = usePathname();
  const [menuOpen, setMenuOpen] = useState(false);
  const [hidden, setHidden] = useState(false);

  // Close the phone menu on navigation.
  useEffect(() => setMenuOpen(false), [pathname]);

  // Slide away while scrolling down (more room to read), come back on scroll up.
  useEffect(() => {
    let lastY = window.scrollY;
    const onScroll = () => {
      const y = window.scrollY;
      if (y < 80) setHidden(false);
      else if (y > lastY + 6) setHidden(true);
      else if (y < lastY - 6) setHidden(false);
      lastY = y;
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <>
      <header
        style={{ viewTransitionName: "site-header" }}
        className={cn(
          "sticky top-0 z-50 w-full border-b border-border bg-background/85 backdrop-blur-md transition-transform duration-300 ease-out motion-reduce:transition-none",
          hidden && !menuOpen && "-translate-y-full",
        )}
      >
        <div className="container mx-auto flex h-16 max-w-3xl items-center gap-6 px-5 sm:px-6">
          <Link
            href="/"
            aria-label="Harshdeep Athawale, home"
            className="group flex shrink-0 items-center gap-2 text-foreground"
          >
            <LogoMark className="size-6 transition-transform duration-500 group-hover:rotate-90" />
            <span className="font-display text-xl">harshdeep</span>
          </Link>

          <nav aria-label="Primary" className="hidden items-center gap-6 md:flex">
            {headerNav.map((item) => {
              const current = isActive(pathname, item.href);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  aria-current={current ? "page" : undefined}
                  className={cn(
                    "relative py-1 text-sm font-medium text-foreground transition-opacity duration-200 hover:opacity-100",
                    // Accent underline slides in on hover and marks the current page.
                    "after:pointer-events-none after:absolute after:inset-x-0 after:-bottom-1 after:h-px after:origin-left after:bg-sun after:transition-transform after:duration-300 hover:after:scale-x-100",
                    current ? "after:scale-x-100" : "opacity-70 after:scale-x-0",
                  )}
                >
                  {item.label}
                </Link>
              );
            })}
            <MoreMenu pathname={pathname} />
          </nav>

          <div className="ml-auto flex items-center gap-2">
            <button
              type="button"
              onClick={openSearch}
              aria-label="Search (Ctrl K)"
              className="hidden size-9 items-center justify-center rounded-sm border border-border text-secondary transition-colors hover:border-foreground/30 hover:text-foreground sm:inline-flex"
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
            {/* Phones: a bracketed menu button, like [ = ] */}
            <button
              type="button"
              onClick={() => setMenuOpen((prev) => !prev)}
              aria-expanded={menuOpen}
              aria-controls="mobile-menu"
              aria-label={menuOpen ? "Close menu" : "Open menu"}
              className="corner-frame relative inline-flex size-10 items-center justify-center md:hidden"
              style={{ "--corner": "7px" } as React.CSSProperties}
            >
              <span
                className={cn(
                  "absolute h-px w-4 bg-foreground transition-transform duration-300",
                  menuOpen ? "rotate-45" : "-translate-y-[3px]",
                )}
              />
              <span
                className={cn(
                  "absolute h-px w-4 bg-foreground transition-transform duration-300",
                  menuOpen ? "-rotate-45" : "translate-y-[3px]",
                )}
              />
            </button>
          </div>
        </div>
      </header>
      <MobileMenu open={menuOpen} onClose={() => setMenuOpen(false)} pathname={pathname} />
    </>
  );
}
