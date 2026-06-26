export type Achievement = {
  slug: string;
  title: string;
  organization: string;
  year: string;
  periodShort: string;
  periodLong: string;
  details?: string[];
  /** Cover image for cards and detail header */
  image?: string;
  /** Pinterest-style photo gallery on the detail page */
  gallery?: string[];
  featured?: boolean;
};

export const achievements: Achievement[] = [
  {
    slug: "tryhackme-top-1-percent",
    title: "Top 1% Worldwide",
    organization: "TryHackMe",
    year: "2026",
    periodShort: "2025–26",
    periodLong: "2025 – 2026",
    details: [
      "Ranked in the Top 1% worldwide (India Rank #2,052).",
      "300+ day learning streak — consistency over intensity.",
      "230+ hands-on labs solved across web, network, and exploitation paths.",
    ],
    featured: true,
    image: "/assets/achievements/tryhackme-harshdeepathawale-300-streak.png",
    gallery: ["/assets/achievements/tryhackme-harshdeepathawale-300-streak.png"],
  },
  {
    slug: "redbull-critical",
    title: "Critical · CVSS 9.1",
    organization: "Red Bull",
    year: "2026",
    periodShort: "June",
    periodLong: "June",
    featured: true,
    image: "/assets/achievements/critical-severity-9-1.png",
    gallery: ["/assets/achievements/critical-severity-9-1.png"],
  },
];

export function getAchievement(slug: string) {
  return achievements.find((item) => item.slug === slug);
}
