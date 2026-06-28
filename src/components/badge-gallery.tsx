import { cn } from "@/lib/utils";

export function BadgeGallery({
  images,
  title,
  className,
}: {
  images: string[];
  title: string;
  className?: string;
}) {
  if (images.length === 0) return null;

  return (
    <div
      className={cn(
        "grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4",
        className,
      )}
    >
      {images.map((src, index) => (
        <div
          key={`${src}-${index}`}
          className="group overflow-hidden rounded-xl border border-border bg-card shadow-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-md"
        >
          {/* Native img preserves the badge's natural 2:1 aspect ratio */}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={src}
            alt={`${title} — badge ${index + 1}`}
            loading={index < 4 ? "eager" : "lazy"}
            className="aspect-[2/1] w-full object-cover"
          />
        </div>
      ))}
    </div>
  );
}
