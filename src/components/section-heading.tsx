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
  /** Optional section number, rendered as a quiet "01 —" prefix. */
  index?: number;
}) {
  return (
    <div className={cn("mb-4", className)}>
      <h2
        className={cn(
          "tracking-tight text-foreground",
          uppercase
            ? "font-mono text-xs font-medium uppercase tracking-[0.2em] text-secondary"
            : "font-display text-xl font-medium",
        )}
      >
        {index !== undefined && (
          <>
            <span className="text-sage">{String(index).padStart(2, "0")}</span>
            <span aria-hidden className="mx-2 text-foreground/25">
              —
            </span>
          </>
        )}
        {title}
      </h2>
    </div>
  );
}
