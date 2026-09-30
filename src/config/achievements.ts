// Content lives in content/data/achievements.json (editable from /admin).
import data from "../../content/data/achievements.json";

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
  /** Show the gallery as a fanned "hand of cards" poster instead of `image` */
  badgeFan?: boolean;
  featured?: boolean;
};

export const achievements = data as Achievement[];

export function getAchievement(slug: string) {
  return achievements.find((item) => item.slug === slug);
}
