// Content lives in content/data/projects.json (editable from /admin).
import type { ShapeName } from "@/lib/particle-shapes";
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
  /** Animated particle poster (see projectScenes); takes precedence over the cover */
  scene?: "waf" | "deepfake";
  /** 2-letter monogram shown on the gradient tile */
  monogram?: string;
  gradient: string;
};

export const projects = data as Project[];

/** The particle visual, status line and badge shown for each project scene. */
export const projectScenes: Record<
  NonNullable<Project["scene"]>,
  { shape: ShapeName; status: string; badge: string }
> = {
  waf: { shape: "shield", status: "WAF · inspecting", badge: "96% detection" },
  deepfake: { shape: "face", status: "Deepfake · 4-agent scan", badge: "Scanning" },
};
