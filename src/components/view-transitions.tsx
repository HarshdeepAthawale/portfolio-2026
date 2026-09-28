"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  createContext,
  useContext,
  useEffect,
  useRef,
  type ComponentProps,
  type MouseEvent,
  type MutableRefObject,
} from "react";

type Pending = MutableRefObject<(() => void) | null>;
const PendingNavigation = createContext<Pending | null>(null);

type ViewTransitionDocument = Document & {
  startViewTransition?: (update: () => Promise<void>) => unknown;
};

/**
 * Lets TransitionLink run client navigations inside a View Transition: the
 * transition's update callback resolves once the new route has committed.
 */
export function ViewTransitionsProvider({ children }: { children: React.ReactNode }) {
  const pending = useRef<(() => void) | null>(null);
  const pathname = usePathname();

  useEffect(() => {
    const resolve = pending.current;
    pending.current = null;
    // Wait a frame so the new page is painted before the snapshot is taken.
    if (resolve) requestAnimationFrame(() => resolve());
  }, [pathname]);

  return <PendingNavigation.Provider value={pending}>{children}</PendingNavigation.Provider>;
}

/**
 * A next/link that animates the page change: elements sharing a
 * view-transition-name (e.g. a project poster) morph between pages, and the
 * rest cross-fades. Falls back to a normal navigation when unsupported, for
 * reduced motion, new-tab clicks, and external targets.
 */
export function TransitionLink({ href, onClick, ...props }: ComponentProps<typeof Link>) {
  const router = useRouter();
  const pending = useContext(PendingNavigation);

  const handleClick = (event: MouseEvent<HTMLAnchorElement>) => {
    onClick?.(event);
    if (event.defaultPrevented || !pending) return;
    if (event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) {
      return;
    }
    if (props.target && props.target !== "_self") return;

    const doc = document as ViewTransitionDocument;
    if (!doc.startViewTransition) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    const url = typeof href === "string" ? href : href.toString();
    if (url === window.location.pathname) return;

    event.preventDefault();
    doc.startViewTransition(
      () =>
        new Promise<void>((resolve) => {
          pending.current = resolve;
          router.push(url);
          // The page is frozen while this promise is pending, so cap it: on a
          // slow route the animation completes and navigation finishes normally.
          setTimeout(() => {
            if (pending.current === resolve) {
              pending.current = null;
              resolve();
            }
          }, 1200);
        }),
    );
  };

  return <Link href={href} onClick={handleClick} {...props} />;
}
