// Content lives in content/data/hero.json (editable from /admin).
import data from "../../content/data/hero.json";

export type SocialIcon = "x" | "linkedin" | "github" | "medium";

export type SocialLink = { name: string; href: string; icon: SocialIcon };

export type HeroConfig = {
  name: string;
  email: string;
  bio: string;
  avatar: string;
  avatarSmile: string;
  /** Images the circular avatar cycles through, in order. */
  avatarRotation: string[];
  /** How long each image stays before crossfading to the next (ms). */
  avatarRotationInterval: number;
  timezone: string;
  location: string;
  availability: string;
};

const { socialLinks: links, ...hero } = data;

export const heroConfig: HeroConfig = hero;
export const socialLinks = links as SocialLink[];
