"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { heroConfig } from "@/config/hero";
import { cn } from "@/lib/utils";

export function ProfileAvatar({ className }: { className?: string }) {
  const images = heroConfig.avatarRotation;
  const [active, setActive] = useState(0);
  const [paused, setPaused] = useState(false);

  useEffect(() => {
    if (paused || images.length <= 1) return;
    const id = setInterval(() => {
      setActive((i) => (i + 1) % images.length);
    }, heroConfig.avatarRotationInterval);
    return () => clearInterval(id);
  }, [paused, images.length]);

  return (
    <div
      className={cn(
        "group relative size-24 shrink-0 cursor-pointer overflow-hidden rounded-full bg-blue-300 dark:bg-yellow-300",
        className,
      )}
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      title="Harshdeep / anime"
    >
      {images.map((src, i) => (
        <Image
          key={src}
          src={src}
          alt={`${heroConfig.name} profile`}
          width={96}
          height={96}
          className={cn(
            "absolute inset-0 size-full rounded-full object-cover transition-opacity duration-700",
            i === active ? "opacity-100" : "opacity-0",
          )}
          priority={i === 0}
        />
      ))}
    </div>
  );
}
