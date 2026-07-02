"use client";

import Script from "next/script";
import { petConfig } from "@/config/pet";

export function CursorPet() {
  if (!petConfig.enabled) return null;

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
