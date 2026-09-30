// Content lives in content/data/experience.json (editable from /admin).
import data from "../../content/data/experience.json";

export type ExperiencePhoto = { src: string; alt: string };

/** One position within a company, for multi-role entries (like LinkedIn). */
export type ExperienceRole = {
  title: string;
  periodShort: string;
  periodLong: string;
  working?: boolean;
  details?: string[];
  photos?: ExperiencePhoto[];
};

export type ExperienceItem = {
  company: string;
  logo: string;
  /** Single-role entries. Multi-role entries use `roles` instead. */
  role?: string;
  employmentType?: string;
  periodShort: string;
  periodLong: string;
  locationShort: string;
  locationLong: string;
  working?: boolean;
  details?: string[];
  tech?: string[];
  /** Photos shown in the expanded details (open in the lightbox). */
  photos?: ExperiencePhoto[];
  /** Positions held at this company, newest first. */
  roles?: ExperienceRole[];
};

export const experience = data as ExperienceItem[];
