import type { CSSProperties } from "react";
import { cn } from "@/lib/utils";

/**
 * A showcase poster for badge collections: the badges fanned like a hand of
 * cards on a soft backdrop, spreading apart on hover. Pure CSS.
 */
export function BadgeFan({
  images,
  title,
  className,
}: {
  images: string[];
  title: string;
  className?: string;
}) {
  // Fan slots ordered centre-out (left before right on ties). Images are given
  // most-important first, so the lead badge takes the front-centre slot.
  const middle = (images.length - 1) / 2;
  const slots = images
    .map((_, i) => i - middle)
    .sort((a, b) => Math.abs(a) - Math.abs(b) || a - b);

  return (
    <div
      role="img"
      aria-label={`${title} badges`}
      className={cn(
        "group/fan relative aspect-[2/1] overflow-hidden bg-muted/40",
        "bg-[radial-gradient(ellipse_at_50%_115%,var(--sun-soft),transparent_70%)]",
        "[--spread:30%] [--tilt:5deg] hover:[--spread:38%] hover:[--tilt:7deg]",
        className,
      )}
    >
      {images.map((src, i) => {
        const offset = slots[i]!;
        return (
          <div
            key={src}
            className="absolute left-1/2 top-[27%] w-[40%] transition-transform duration-500 ease-[cubic-bezier(0.22,1,0.36,1)]"
            style={
              {
                "--o": offset,
                transform:
                  "translateX(-50%) translateX(calc(var(--o) * var(--spread))) rotate(calc(var(--o) * var(--tilt)))",
                transformOrigin: "50% 180%",
                // More important badges stack on top.
                zIndex: images.length - i,
              } as CSSProperties
            }
          >
            {/* eslint-disable-next-line @next/next/no-img-element -- decorative badge art */}
            <img
              src={src}
              alt=""
              loading="lazy"
              className="w-full rounded-xl border border-border shadow-[0_10px_30px_-12px_rgba(0,0,0,0.35)]"
            />
          </div>
        );
      })}
    </div>
  );
}
