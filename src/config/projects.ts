// Content lives in content/data/projects.json (editable from /admin).
import data from "../../content/data/projects.json";

export type Project = {
  slug: string;
  title: string;
  date: string;
  description: string;
  tech: string[];
  href: string;
  website?: string;
  featured?: boolean;
  /** Optional cover image for project cards (fallback when no scene) */
  cover?: string;
  /** Animated CSS-3D poster; takes precedence over the static cover */
  scene?: "waf" | "deepfake";
  /** 2-letter monogram shown on the gradient tile */
  monogram?: string;
  gradient: string;
};

export const projects = data as Project[];
