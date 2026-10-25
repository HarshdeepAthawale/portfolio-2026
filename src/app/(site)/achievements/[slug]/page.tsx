import { notFound } from "next/navigation";
import { AchievementGallery } from "@/components/achievement-gallery";
import { AchievementPhoto } from "@/components/achievement-photo";
import { BadgeFan } from "@/components/badge-fan";
import { BadgeGallery } from "@/components/badge-gallery";
import { GameScreen } from "@/components/minecraft/ui";
import { GameScroll } from "@/components/minecraft/game-scroll";
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

  return <GameScreen title={achievement.organization} backHref="/achievements" className="mc-project-detail-screen">
    <GameScroll className="mc-dark-panel mc-collection-scroll" aria-label={`${achievement.organization} achievement details`}>
      <div className="mc-collection-content">
        <header className="mc-detail-card">
          <span className="mc-detail-date">{achievement.periodLong === achievement.year ? achievement.year : `${achievement.periodLong} · ${achievement.year}`}</span>
          <h2>{achievement.title}</h2>
          {achievement.details && achievement.details.length > 0 && <ul className="mc-bullets">{achievement.details.map(detail => <li key={detail}>{detail}</li>)}</ul>}
        </header>
        <div className="mc-detail-card mc-achievement-hero">
          {achievement.badgeFan && achievement.gallery?.length
            ? <BadgeFan images={achievement.gallery} title={achievement.organization} />
            : achievement.image && <AchievementPhoto achievement={achievement} fit="natural" priority />}
        </div>
        {hasGallery && <section className="mc-detail-card mc-achievement-gallery">
          <h2>{achievement.badgeGallery ? "Hall of Fame" : "Photos"}</h2>
          <p>{achievement.badgeGallery ? `Badges earned on ${achievement.organization}.` : `Moments from ${achievement.organization}.`}</p>
          {achievement.badgeGallery
            ? <BadgeGallery images={achievement.gallery!} title={achievement.organization} className="mt-4" />
            : <AchievementGallery images={achievement.gallery!} title={achievement.organization} className="mt-4" />}
        </section>}
      </div>
    </GameScroll>
  </GameScreen>;
}
