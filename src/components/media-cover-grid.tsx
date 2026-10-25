import { MediaCoverCard } from "@/components/media-cover-card";
import type { Favourite } from "@/config/favourites";
import { cn } from "@/lib/utils";

export function MediaCoverGrid({ items, className }: { items: Favourite[]; className?: string }) {
  return (
    <div className={cn("mc-media-grid", className)}>
      {items.map((item, index) => (
        <MediaCoverCard key={item.title} item={item} index={index} />
      ))}
    </div>
  );
}
