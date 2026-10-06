import { cn } from "@/lib/utils";

export function SectionHeading({
  title,
  className,
  uppercase = false,
  index,
}: {
  title: string;
  className?: string;
  uppercase?: boolean;
  /** Optional section number, rendered as a quiet "[01]" after the title. */
  index?: number;
}) {
  return (
    <div className={cn("mb-4", className)}>
      <h2
        className={cn(
          "text-foreground",
          uppercase
            ? "flex items-center gap-2.5 font-mono text-xs font-medium uppercase tracking-[0.18em] text-secondary"
            : "font-display text-2xl font-medium",
        )}
      >
        {uppercase && <span aria-hidden className="size-1.5 rounded-full bg-sun" />}
        {title}
        {index !== undefined && (
          <span className="text-foreground/35">[{String(index).padStart(2, "0")}]</span>
        )}
      </h2>
    </div>
  );
}
