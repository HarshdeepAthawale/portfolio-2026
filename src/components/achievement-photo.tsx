"use client";

import Image from "next/image";
import { Trophy } from "@phosphor-icons/react";
import { useState } from "react";
import type { Achievement } from "@/config/achievements";
import { cn } from "@/lib/utils";

export function AchievementPhoto({
  achievement,
  className,
  priority = false,
  fit = "contain",
}: {
  achievement: Achievement;
  className?: string;
  priority?: boolean;
  fit?: "cover" | "contain";
}) {
  const [failed, setFailed] = useState(false);
  const showPlaceholder = !achievement.image || failed;

  if (showPlaceholder) {
    return (
      <div
        className={cn(
          "flex flex-col items-center justify-center gap-2 border border-dashed border-border bg-muted/40 text-secondary",
          className,
        )}
      >
        <Trophy className="size-8 opacity-40" weight="duotone" />
        <span className="px-4 text-center text-xs">Photo coming soon</span>
      </div>
    );
  }

  return (
    <div className={cn("relative overflow-hidden bg-muted", className)}>
      <Image
        src={achievement.image!}
        alt={`${achievement.organization} — ${achievement.title}`}
        fill
        sizes="(max-width: 768px) 100vw, 400px"
        className={fit === "cover" ? "object-cover" : "object-contain"}
        priority={priority}
        onError={() => setFailed(true)}
      />
    </div>
  );
}
