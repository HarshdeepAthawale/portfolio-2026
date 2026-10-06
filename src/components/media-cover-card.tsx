"use client";

import Image from "next/image";
import { useState } from "react";
import type { Favourite } from "@/config/favourites";
import { cn } from "@/lib/utils";

/**
 * A poster with its details always visible underneath (nothing hides behind
 * hover, so it reads the same on phones).
 */
export function MediaCoverCard({
  item,
  index,
  className,
}: {
  item: Favourite;
  index: number;
  className?: string;
}) {
  const [failed, setFailed] = useState(false);
  const meta = [item.year, item.by, item.language].filter(Boolean).join(" · ");

  return (
    <article className={cn("group", className)}>
      <div className="relative aspect-[2/3] overflow-hidden rounded-md border border-border bg-muted transition-colors duration-300 group-hover:border-foreground/25">
        {!failed ? (
          <Image
            src={item.cover}
            alt={`${item.title} poster`}
            fill
            sizes="(max-width: 640px) 46vw, (max-width: 1024px) 30vw, 240px"
            className="object-cover transition-transform duration-500 ease-out group-hover:scale-[1.04]"
            onError={() => setFailed(true)}
          />
        ) : (
          <div className="flex size-full items-center justify-center p-4 text-center">
            <span className="font-display text-xl text-secondary">{item.title}</span>
          </div>
        )}
        <span className="absolute left-2 top-2 rounded-sm bg-background/85 px-1.5 py-0.5 font-mono text-[10px] tracking-[0.1em] text-foreground/80 backdrop-blur-sm">
          {String(index + 1).padStart(2, "0")}
        </span>
      </div>

      <h3 className="mt-3 font-display text-lg leading-snug sm:text-xl">{item.title}</h3>
      {meta && (
        <p className="mt-1 font-mono text-[10px] uppercase leading-relaxed tracking-[0.12em] text-secondary">
          {meta}
        </p>
      )}
      {item.note && <p className="mt-2 text-sm leading-relaxed text-secondary">{item.note}</p>}
    </article>
  );
}
