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
  /** When true, renders the gallery as a uniform badge wall instead of masonry */
  badgeGallery?: boolean;
  featured?: boolean;
};

export const achievements: Achievement[] = [
  {
    slug: "psb-hackathon-series-2026-runner-up",
    title: "National 1st Runner-Up",
    organization: "PSB Hackathon Series 2026",
    year: "2026",
    periodShort: "Aug 1",
    periodLong: "August 1, 2026",
    details: [
      "Organized by the Government of India, Ministry of Finance, with Central Bank of India & MNNIT Allahabad.",
      "Outlasted 226 registered teams through a 30-team shortlist to reach the 8-team grand finale.",
      "Won an INR 3,00,000 cash prize as part of Team Dhurandhar.",
    ],
    featured: true,
    image: "/assets/achievements/psb-hackathon-series-2026-runner-up.jpg",
    gallery: [
      "/assets/achievements/psb-hackathon-series-2026-runner-up.jpg",
      "/assets/achievements/psb-hackathon-series-2026-cheque.jpg",
    ],
  },
  {
    slug: "intigriti-hall-of-fame",
    title: "Hall of Fame · 4 Badges",
    organization: "Intigriti",
    year: "2026",
    periodShort: "2026",
    periodLong: "2026",
    details: [
      "Recognized on Intigriti with four severity badges across multiple programs.",
      "Exceptional severity (4×), Critical severity (3×), Medium severity (2×), and First valid submission.",
      "Consistent valid reports from recon to exploitation chain.",
    ],
    featured: true,
    image: "/assets/achievements/intigriti-exceptional-severity.png",
    gallery: [
      "/assets/achievements/intigriti-exceptional-severity.png",
      "/assets/achievements/intigriti-critical-severity.png",
      "/assets/achievements/intigriti-medium-severity.png",
      "/assets/achievements/intigriti-one-valid-submission.png",
    ],
    badgeGallery: true,
  },
  {
    slug: "tryhackme-top-1-percent",
    title: "Top 1% Worldwide",
    organization: "TryHackMe",
    year: "2026",
    periodShort: "2025-26",
    periodLong: "2025 - 2026",
    details: [
      "Ranked in the Top 1% worldwide (India Rank #2,052).",
      "300+ day learning streak - consistency over intensity.",
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
