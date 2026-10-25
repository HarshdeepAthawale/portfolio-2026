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
    <article className={cn("mc-media-card", className)}>
      <div className="mc-media-cover">
        {!failed ? (
          <Image
            src={item.cover}
            alt={`${item.title} poster`}
            fill
            sizes="(max-width: 640px) 46vw, (max-width: 1024px) 30vw, 240px"
            className="object-cover"
            onError={() => setFailed(true)}
          />
        ) : (
          <div className="mc-media-fallback">
            <span>{item.title}</span>
          </div>
        )}
        <span className="mc-media-index">
          {String(index + 1).padStart(2, "0")}
        </span>
      </div>

      <h3>{item.title}</h3>
      {meta && (
        <p className="mc-media-meta">
          {meta}
        </p>
      )}
      {item.note && <p className="mc-media-note">{item.note}</p>}
    </article>
  );
}
