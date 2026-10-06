import { MediaCoverCard } from "@/components/media-cover-card";
import type { Favourite } from "@/config/favourites";
import { cn } from "@/lib/utils";

export function MediaCoverGrid({ items, className }: { items: Favourite[]; className?: string }) {
  return (
    <div className={cn("grid grid-cols-2 gap-x-4 gap-y-8 sm:grid-cols-3 sm:gap-x-5", className)}>
      {items.map((item, index) => (
        <MediaCoverCard key={item.title} item={item} index={index} />
      ))}
    </div>
  );
}
