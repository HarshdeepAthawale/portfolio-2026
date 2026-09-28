"use client";

import { X } from "@phosphor-icons/react";
import { usePathname } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";

// Images that can be opened full-screen: gallery photos and article images.
const ZOOMABLE = ".achievement-gallery img, .prose-reading img";

type Open = { src: string; alt: string };

/**
 * Site-wide photo lightbox. Delegates clicks (and Enter/Space) on zoomable
 * images, so pages don't need to change their markup.
 */
export function Lightbox() {
  const pathname = usePathname();
  const [image, setImage] = useState<Open | null>(null);
  const opener = useRef<HTMLElement | null>(null);
  const closeButton = useRef<HTMLButtonElement>(null);

  // Make zoomable images reachable and announced for keyboard users.
  useEffect(() => {
    document.querySelectorAll<HTMLImageElement>(ZOOMABLE).forEach((img) => {
      img.tabIndex = 0;
      img.setAttribute("role", "button");
      img.setAttribute("aria-label", `View larger: ${img.alt || "image"}`);
    });
  }, [pathname]);

  useEffect(() => {
    const open = (img: HTMLImageElement) => {
      opener.current = img;
      setImage({ src: img.currentSrc || img.src, alt: img.alt });
    };
    const onClick = (event: MouseEvent) => {
      const img = (event.target as Element | null)?.closest?.(ZOOMABLE);
      if (img instanceof HTMLImageElement) {
        event.preventDefault();
        open(img);
      }
    };
    const onKeyDown = (event: KeyboardEvent) => {
      const target = event.target;
      if (
        (event.key === "Enter" || event.key === " ") &&
        target instanceof HTMLImageElement &&
        target.matches(ZOOMABLE)
      ) {
        event.preventDefault();
        open(target);
      }
    };
    document.addEventListener("click", onClick);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("click", onClick);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, []);

  const close = useCallback(() => {
    setImage(null);
    opener.current?.focus();
  }, []);

  // While open: Esc closes, the page behind doesn't scroll, focus stays inside.
  useEffect(() => {
    if (!image) return;
    closeButton.current?.focus();
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") close();
      if (event.key === "Tab") {
        event.preventDefault();
        closeButton.current?.focus();
      }
    };
    const overflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.body.style.overflow = overflow;
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [image, close]);

  if (!image) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={image.alt || "Image"}
      onClick={close}
      className="fixed inset-0 z-[100] flex animate-in flex-col items-center justify-center gap-4 bg-background/90 p-4 backdrop-blur-sm fade-in duration-200 sm:p-8"
    >
      {/* eslint-disable-next-line @next/next/no-img-element -- full-size view of an already-loaded image */}
      <img
        src={image.src}
        alt={image.alt}
        onClick={(event) => event.stopPropagation()}
        className="max-h-[85vh] max-w-full animate-in rounded-xl border border-border object-contain shadow-2xl zoom-in-95 duration-300"
      />
      {image.alt && (
        <p className="max-w-2xl text-center text-sm text-secondary">{image.alt}</p>
      )}
      <button
        ref={closeButton}
        type="button"
        onClick={close}
        aria-label="Close"
        className="absolute right-4 top-4 flex size-10 items-center justify-center rounded-full border border-border bg-card text-secondary transition-colors hover:text-foreground"
      >
        <X className="size-5" />
      </button>
    </div>
  );
}
