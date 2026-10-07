import Link from "next/link";
import { ArrowLeft } from "@phosphor-icons/react/dist/ssr";
import { AchievementCard } from "@/components/landing/achievement-card";
import { Container } from "@/components/container";
import { achievements } from "@/config/achievements";
import { withImageSizes } from "@/lib/image-size";

export const metadata = {
  title: "Honors & Awards - Harshdeep Athawale",
  description: "Hackathon wins, awards, and milestones.",
};

export default async function AchievementsPage() {
  const items = await withImageSizes(achievements);
  return (
    <div className="space-y-10 pb-16 pt-8">
      <Container>
        <Link
          href="/"
          className="mb-6 inline-flex items-center gap-1.5 text-sm text-secondary transition-colors hover:text-foreground"
        >
          <ArrowLeft className="hit-area size-4" />
          Back home
        </Link>
        <h1 className="font-display text-3xl font-medium tracking-tight">Honors &amp; Awards</h1>
        <p className="mt-3 max-w-xl text-secondary">
          Awards, hackathon results, and milestones.
        </p>
      </Container>

      <Container>
        <div className="flex flex-col gap-4">
          {items.map((achievement, index) => (
            <AchievementCard
              key={achievement.slug}
              achievement={achievement}
              showPhoto
              linkToDetail
              delay={index * 0.05}
            />
          ))}
        </div>
      </Container>
    </div>
  );
}
