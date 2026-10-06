"use client";

import Script from "next/script";
import { useEffect, useState } from "react";
import { petConfig } from "@/config/pet";

export function CursorPet() {
  // The pet chases the mouse. On touch screens there's no cursor to chase, so it
  // would just sit on top of the header; only load it where there's a real pointer.
  const [hasPointer, setHasPointer] = useState(false);

  useEffect(() => {
    setHasPointer(window.matchMedia("(hover: hover) and (pointer: fine)").matches);
  }, []);

  if (!petConfig.enabled || !hasPointer) return null;

  return (
    <Script
      src="/oneko/oneko.js"
      data-cat="/oneko/crab.png"
      data-sleep="/oneko/crab-sleep.png"
      data-name={petConfig.name}
      data-wake-text={petConfig.wakeText}
      data-spawn-x={String(petConfig.spawn.x)}
      data-spawn-y={String(petConfig.spawn.y)}
      data-persist-position={String(petConfig.persistPosition)}
      strategy="afterInteractive"
    />
  );
}
