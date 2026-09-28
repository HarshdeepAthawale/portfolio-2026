import { Hero } from "@/components/landing/hero";
import { TechStackSection } from "@/components/landing/tech-stack-section";
import { ExperienceSection } from "@/components/landing/experience-section";
import { AchievementsSection } from "@/components/landing/achievements-section";
import { FeaturedProjects } from "@/components/landing/featured-projects";
import { GitHubContributions } from "@/components/landing/github-contributions";
import { QuoteVisitorCard } from "@/components/landing/quote-visitor-card";

export default function HomePage() {
  return (
    <div className="space-y-20 pb-20 pt-14 sm:space-y-24">
      <Hero />
      <TechStackSection index={1} />
      <ExperienceSection limit={3} showAllLink index={2} />
      <AchievementsSection limit={3} showAllLink index={3} />
      <FeaturedProjects limit={2} index={4} />
      <GitHubContributions index={5} />
      <QuoteVisitorCard />
    </div>
  );
}
