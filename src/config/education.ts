// Content lives in content/data/education.json (editable from /admin).
import data from "../../content/data/education.json";

export type EducationItem = { school: string; degree: string; period: string };

export const education: EducationItem[] = data.education;
export const skills: string[] = data.skills;
