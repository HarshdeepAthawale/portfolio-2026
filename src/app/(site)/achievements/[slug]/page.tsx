import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "@phosphor-icons/react/dist/ssr";
import { AchievementGallery } from "@/components/achievement-gallery";
import { AchievementPhoto } from "@/components/achievement-photo";
import { BadgeFan } from "@/components/badge-fan";
import { BadgeGallery } from "@/components/badge-gallery";
import { Container } from "@/components/container";
import { achievements, getAchievement } from "@/config/achievements";
import { getImageSize } from "@/lib/image-size";

export async function generateStaticParams() {
  return achievements.map((item) => ({ slug: item.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const achievement = getAchievement(slug);
  if (!achievement) return {};
  return {
    title: `${achievement.organization} - Honors & Awards`,
    description: `${achievement.title} at ${achievement.organization}.`,
  };
}

export default async function AchievementDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const found = getAchievement(slug);
  const achievement = found && { ...found, imageSize: await getImageSize(found.image) };
  if (!achievement) notFound();

  const hasGallery = Boolean(achievement.gallery?.length);

  return (
    <div className="space-y-10 pb-16 pt-8">
      <Container>
        <Link
          href="/achievements"
          className="inline-flex items-center gap-1.5 text-sm text-secondary transition-colors hover:text-foreground"
        >
          <ArrowLeft className="hit-area size-4" />
          Back to honors &amp; awards
        </Link>

        <div className="mt-6 overflow-hidden rounded-2xl border border-border bg-card">
          {achievement.badgeFan && achievement.gallery?.length ? (
            <BadgeFan images={achievement.gallery} title={achievement.organization} />
          ) : (
            achievement.image && (
              <AchievementPhoto achievement={achievement} fit="natural" priority />
            )
          )}
          <div className="space-y-4 p-5 sm:p-6">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="font-display text-2xl font-medium tracking-tight sm:text-3xl">
                {achievement.organization}
              </h1>
              <span className="rounded-md border border-border bg-muted px-2.5 py-1 text-xs font-medium text-secondary">
                {achievement.title}
              </span>
            </div>
            <p className="text-sm text-secondary">
              {achievement.periodLong === achievement.year
                ? achievement.year
                : `${achievement.periodLong} · ${achievement.year}`}
            </p>
            {achievement.details && achievement.details.length > 0 && (
              <ul className="space-y-1.5 text-sm leading-relaxed text-secondary">
                {achievement.details.map((detail) => (
                  <li key={detail}>• {detail}</li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </Container>

      {hasGallery ? (
        <Container>
          <h2 className="font-display text-xl font-medium tracking-tight">
            {achievement.badgeGallery ? "Hall of Fame" : "Photos"}
          </h2>
          <p className="mt-1 text-sm text-secondary">
            {achievement.badgeGallery
              ? `Badges earned on ${achievement.organization}.`
              : `Moments from ${achievement.organization}.`}
          </p>
          {achievement.badgeGallery ? (
            <BadgeGallery
              images={achievement.gallery!}
              title={achievement.organization}
              className="mt-6"
            />
          ) : (
            <AchievementGallery
              images={achievement.gallery!}
              title={achievement.organization}
              className="mt-6"
            />
          )}
        </Container>
      ) : null}
    </div>
  );
}
