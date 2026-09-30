"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

/**
 * Re-fetches the page's server data on an interval while the tab is visible,
 * so the numbers stay live without a reload. Shows when they were last updated.
 */
export function AutoRefresh({ seconds = 15 }: { seconds?: number }) {
  const router = useRouter();
  const [updated, setUpdated] = useState(() => new Date());

  useEffect(() => {
    const refresh = () => {
      if (document.visibilityState !== "visible") return;
      router.refresh();
      setUpdated(new Date());
    };
    const timer = window.setInterval(refresh, seconds * 1000);
    // Catch up straight away when you come back to the tab.
    document.addEventListener("visibilitychange", refresh);
    return () => {
      window.clearInterval(timer);
      document.removeEventListener("visibilitychange", refresh);
    };
  }, [router, seconds]);

  return (
    <span className="text-xs text-secondary" aria-live="off">
      Live · updated {updated.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" })}
    </span>
  );
}
