"use client";

import { forwardRef, useEffect, useImperativeHandle, useRef, type HTMLAttributes } from "react";
import { useWorld } from "./world";

/** Reference wheel inertia: Lenis, lerp .16; touch and keyboard stay native. */
export const GameScroll = forwardRef<HTMLDivElement, HTMLAttributes<HTMLDivElement>>(function GameScroll(
  { children, className = "", ...props }, forwardedRef,
) {
  const wrapper = useRef<HTMLDivElement>(null);
  const content = useRef<HTMLDivElement>(null);
  const { reduced } = useWorld();
  useImperativeHandle(forwardedRef, () => wrapper.current!);

  useEffect(() => {
    const host = wrapper.current;
    const inner = content.current;
    if (reduced || !host || !inner || typeof ResizeObserver === "undefined") return;
    let disposed = false;
    let cleanup: (() => void) | undefined;
    void import("lenis").then(({ default: Lenis }) => {
      if (disposed) return;
      const scroll = new Lenis({ wrapper: host, content: inner, eventsTarget: host, smoothWheel: true, syncTouch: false, lerp: 0.16, autoRaf: true, autoResize: false });
      const sync = () => scroll.scrollTo(host.scrollTop, { immediate: true });
      const resize = new ResizeObserver(() => { sync(); scroll.resize(); });
      resize.observe(host);
      resize.observe(inner);
      ["keydown", "pointerdown", "focusin"].forEach(name => host.addEventListener(name, sync, true));
      cleanup = () => {
        resize.disconnect();
        ["keydown", "pointerdown", "focusin"].forEach(name => host.removeEventListener(name, sync, true));
        scroll.destroy();
      };
    }).catch(() => { /* Native scrolling remains available if the optional chunk fails. */ });
    return () => { disposed = true; cleanup?.(); };
  }, [reduced]);

  return <div ref={wrapper} className={`mc-scrollbar ${className}`} role="region" tabIndex={0} {...props}><div className="mc-scroll-content" ref={content}>{children}</div></div>;
});
