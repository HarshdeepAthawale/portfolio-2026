import { cn } from "@/lib/utils";

export function SectionHeading({
  title,
  className,
  uppercase = false,
}: {
  title: string;
  className?: string;
  uppercase?: boolean;
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
        {title}
      </h2>
    </div>
  );
}
