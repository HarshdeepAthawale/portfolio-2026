import Link from "next/link";
import { ArrowUpRight } from "@phosphor-icons/react/dist/ssr";
import { AchievementCard } from "@/components/landing/achievement-card";
import { Container } from "@/components/container";
import { SectionHeading } from "@/components/section-heading";
import { achievements } from "@/config/achievements";
import { withImageSizes } from "@/lib/image-size";

export async function AchievementsSection({
  limit,
  showAllLink = false,
  index,
}: {
  limit?: number;
  showAllLink?: boolean;
  index?: number;
}) {
  const items = await withImageSizes(limit ? achievements.slice(0, limit) : achievements);

  return (
    <Container>
      <div className="mb-4 flex items-end justify-between gap-4">
        <SectionHeading title="Honors & Awards" uppercase className="mb-0" index={index} />
        {showAllLink && (
          <Link
            href="/achievements"
            className="hit-area inline-flex shrink-0 items-center gap-1 font-mono text-xs uppercase tracking-[0.15em] text-secondary transition-colors hover:text-foreground"
          >
            View all
            <ArrowUpRight className="size-3.5" />
          </Link>
        )}
      </div>

      <div className="flex flex-col gap-3">
        {items.map((achievement, index) => (
          <AchievementCard
            key={achievement.slug}
            achievement={achievement}
            delay={(index + 1) * 0.05}
          />
        ))}
      </div>
    </Container>
  );
}
