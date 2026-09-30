/**
 * Field schemas for the site-data files in content/data/*.json. One schema drives
 * both the admin form (client) and validation before commit (server). Keys the
 * schema doesn't know are preserved untouched.
 */

type Base = { key: string; label: string; help?: string; required?: boolean };

export type Field =
  | (Base & { kind: "text"; placeholder?: string })
  | (Base & { kind: "textarea"; rows?: number })
  | (Base & { kind: "number" })
  | (Base & { kind: "boolean" })
  | (Base & { kind: "select"; options: { value: string; label: string }[] })
  /** string[] shown as removable chips */
  | (Base & { kind: "tags" })
  /** string[] shown as one textarea per item (bullets, paragraphs) */
  | (Base & { kind: "paragraphs"; itemLabel?: string })
  /** a site image path with upload */
  | (Base & { kind: "image" })
  /** string[] of image paths */
  | (Base & { kind: "images" })
  | (Base & { kind: "object"; fields: Field[] })
  | (Base & { kind: "list"; fields: Field[]; itemTitle: string[]; newItem: Record<string, unknown> });

export type DataSection = {
  key: "hero" | "experience" | "achievements" | "projects" | "education";
  title: string;
  description: string;
  file: string;
  /** Where the change shows up on the site. */
  viewPath: string;
  root:
    | { kind: "object"; fields: Field[] }
    | { kind: "list"; fields: Field[]; itemTitle: string[]; newItem: Record<string, unknown> };
};

const photoList = (key: string, label: string): Field => ({
  kind: "list",
  key,
  label,
  help: "Shown in the expanded details; they open full-size in the lightbox.",
  itemTitle: ["alt"],
  newItem: { src: "", alt: "" },
  fields: [
    { kind: "image", key: "src", label: "Photo", required: true },
    { kind: "text", key: "alt", label: "Caption / alt text", required: true },
  ],
});

export const DATA_SECTIONS: DataSection[] = [
  {
    key: "hero",
    title: "Profile & hero",
    description: "Name, bio, availability line, avatar and social links.",
    file: "content/data/hero.json",
    viewPath: "/",
    root: {
      kind: "object",
      fields: [
        { kind: "text", key: "name", label: "Name", required: true },
        { kind: "text", key: "email", label: "Email", required: true },
        { kind: "textarea", key: "bio", label: "Bio", required: true, rows: 3 },
        {
          kind: "text",
          key: "availability",
          label: "Availability",
          required: true,
          help: "The line next to the pulsing dot under the buttons.",
        },
        { kind: "text", key: "location", label: "Location", required: true },
        {
          kind: "text",
          key: "timezone",
          label: "Timezone",
          required: true,
          help: "IANA name, e.g. Asia/Kolkata.",
        },
        { kind: "image", key: "avatar", label: "Avatar", required: true },
        { kind: "image", key: "avatarSmile", label: "Avatar (smile / favicon)", required: true },
        {
          kind: "images",
          key: "avatarRotation",
          label: "Avatar rotation",
          required: true,
          help: "Images the round avatar cycles through, in order.",
        },
        {
          kind: "number",
          key: "avatarRotationInterval",
          label: "Rotation interval (ms)",
          required: true,
        },
        {
          kind: "list",
          key: "socialLinks",
          label: "Social links",
          required: true,
          itemTitle: ["name"],
          newItem: { name: "", href: "https://", icon: "github" },
          fields: [
            { kind: "text", key: "name", label: "Name", required: true },
            { kind: "text", key: "href", label: "URL", required: true },
            {
              kind: "select",
              key: "icon",
              label: "Icon",
              required: true,
              options: [
                { value: "linkedin", label: "LinkedIn" },
                { value: "github", label: "GitHub" },
                { value: "x", label: "X" },
                { value: "medium", label: "Medium" },
              ],
            },
          ],
        },
      ],
    },
  },
  {
    key: "experience",
    title: "Experience",
    description: "Jobs on the timeline, including multi-role companies and photos.",
    file: "content/data/experience.json",
    viewPath: "/work",
    root: {
      kind: "list",
      itemTitle: ["company"],
      newItem: {
        company: "",
        logo: "",
        role: "",
        employmentType: "Full-time",
        periodShort: "",
        periodLong: "",
        locationShort: "",
        locationLong: "",
      },
      fields: [
        { kind: "text", key: "company", label: "Company", required: true },
        { kind: "image", key: "logo", label: "Logo" },
        {
          kind: "text",
          key: "role",
          label: "Role",
          help: "Leave empty when the company has several roles (below).",
        },
        { kind: "text", key: "employmentType", label: "Employment type", placeholder: "Full-time" },
        { kind: "text", key: "periodShort", label: "Period (short)", required: true, placeholder: "Jul 25 - Present" },
        { kind: "text", key: "periodLong", label: "Period (long)", required: true, placeholder: "July 2025 - Present" },
        { kind: "text", key: "locationShort", label: "Location (short)", required: true },
        { kind: "text", key: "locationLong", label: "Location (long)", required: true },
        { kind: "boolean", key: "working", label: "Currently working here" },
        { kind: "paragraphs", key: "details", label: "Details", itemLabel: "Bullet" },
        { kind: "tags", key: "tech", label: "Tech chips" },
        photoList("photos", "Photos"),
        {
          kind: "list",
          key: "roles",
          label: "Roles",
          help: "For several positions at one company, newest first (like LinkedIn).",
          itemTitle: ["title"],
          newItem: { title: "", periodShort: "", periodLong: "" },
          fields: [
            { kind: "text", key: "title", label: "Title", required: true },
            { kind: "text", key: "periodShort", label: "Period (short)", required: true },
            { kind: "text", key: "periodLong", label: "Period (long)", required: true },
            { kind: "boolean", key: "working", label: "Current role" },
            { kind: "paragraphs", key: "details", label: "Details", itemLabel: "Bullet" },
            photoList("photos", "Photos"),
          ],
        },
      ],
    },
  },
  {
    key: "achievements",
    title: "Achievements",
    description: "Honors, wins and judging, with covers and photo galleries.",
    file: "content/data/achievements.json",
    viewPath: "/achievements",
    root: {
      kind: "list",
      itemTitle: ["title", "organization"],
      newItem: { slug: "", title: "", organization: "", year: "", periodShort: "", periodLong: "" },
      fields: [
        {
          kind: "text",
          key: "slug",
          label: "Slug",
          required: true,
          help: "The URL: /achievements/<slug>. Lowercase words joined by hyphens.",
        },
        { kind: "text", key: "title", label: "Title", required: true },
        { kind: "text", key: "organization", label: "Organization / event", required: true },
        { kind: "text", key: "year", label: "Year", required: true },
        { kind: "text", key: "periodShort", label: "Date (short)", required: true, placeholder: "Sep 5-6" },
        { kind: "text", key: "periodLong", label: "Date (long)", required: true, placeholder: "September 5-6" },
        { kind: "paragraphs", key: "details", label: "Details", itemLabel: "Bullet" },
        { kind: "image", key: "image", label: "Cover image" },
        { kind: "images", key: "gallery", label: "Gallery" },
        { kind: "boolean", key: "featured", label: "Featured on the home page" },
        { kind: "boolean", key: "badgeGallery", label: "Show gallery as a badge wall" },
        { kind: "boolean", key: "badgeFan", label: "Show gallery as a fanned hand of cards" },
      ],
    },
  },
  {
    key: "projects",
    title: "Projects",
    description: "Project cards. Long write-ups are edited under Posts.",
    file: "content/data/projects.json",
    viewPath: "/projects",
    root: {
      kind: "list",
      itemTitle: ["title"],
      newItem: {
        slug: "",
        title: "",
        date: "",
        description: "",
        tech: [],
        href: "https://github.com/HarshdeepAthawale",
        gradient: "from-[#0f1015] via-[#2b3a33] to-[#7fa08a]",
      },
      fields: [
        {
          kind: "text",
          key: "slug",
          label: "Slug",
          required: true,
          help: "Matches the write-up file under Posts → Project write-ups.",
        },
        { kind: "text", key: "title", label: "Title", required: true },
        { kind: "text", key: "date", label: "Date", required: true, placeholder: "02.2026" },
        { kind: "textarea", key: "description", label: "Description", required: true, rows: 4 },
        { kind: "tags", key: "tech", label: "Tech", required: true },
        { kind: "text", key: "href", label: "Code link", required: true },
        { kind: "text", key: "website", label: "Live site" },
        { kind: "boolean", key: "featured", label: "Featured on the home page" },
        { kind: "image", key: "cover", label: "Cover image" },
        {
          kind: "select",
          key: "scene",
          label: "3D poster",
          options: [
            { value: "", label: "None (use cover)" },
            { value: "waf", label: "WAF" },
            { value: "deepfake", label: "Deepfake" },
          ],
        },
        { kind: "text", key: "monogram", label: "Monogram", help: "Two letters for the gradient tile." },
        {
          kind: "text",
          key: "gradient",
          label: "Gradient classes",
          required: true,
          help: "Tailwind gradient stops for the tile background.",
        },
      ],
    },
  },
  {
    key: "education",
    title: "Education & skills",
    description: "Schools and the skills list.",
    file: "content/data/education.json",
    viewPath: "/about",
    root: {
      kind: "object",
      fields: [
        {
          kind: "list",
          key: "education",
          label: "Education",
          required: true,
          itemTitle: ["school"],
          newItem: { school: "", degree: "", period: "" },
          fields: [
            { kind: "text", key: "school", label: "School", required: true },
            { kind: "text", key: "degree", label: "Degree", required: true },
            { kind: "text", key: "period", label: "Period", required: true },
          ],
        },
        { kind: "tags", key: "skills", label: "Skills", required: true },
      ],
    },
  },
];

export function getDataSection(key: string) {
  return DATA_SECTIONS.find((section) => section.key === key);
}

// ---------------------------------------------------------------- Validation

const IMAGE_PATH = /^\/assets\/[A-Za-z0-9_./-]+\.(?:png|jpe?g|webp|gif|avif|svg)$/i;
const MAX_TEXT = 5000;

type Problems = string[];

function checkFields(fields: Field[], value: unknown, at: string, problems: Problems): unknown {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    problems.push(`${at || "Root"} must be an object.`);
    return value;
  }
  const out: Record<string, unknown> = { ...(value as Record<string, unknown>) };
  for (const field of fields) {
    const cleaned = checkField(field, out[field.key], `${at}${at ? " → " : ""}${field.label}`, problems);
    if (cleaned === undefined) delete out[field.key];
    else out[field.key] = cleaned;
  }
  return out;
}

function checkString(v: unknown, where: string, problems: Problems) {
  if (typeof v !== "string") {
    problems.push(`${where} must be text.`);
    return "";
  }
  if (v.length > MAX_TEXT) problems.push(`${where} is too long.`);
  return v.trim();
}

/** Validates one field and returns its cleaned value (undefined = drop the key). */
function checkField(field: Field, value: unknown, where: string, problems: Problems): unknown {
  const empty =
    value === undefined ||
    value === null ||
    value === "" ||
    (Array.isArray(value) && value.length === 0);
  if (empty) {
    // Optional: drop the key. Required lists may be empty (the site expects []).
    if (!field.required || field.kind === "boolean") return undefined;
    if (Array.isArray(value)) return value;
    problems.push(`${where} is required.`);
    return value;
  }

  switch (field.kind) {
    case "text":
    case "textarea": {
      const text = checkString(value, where, problems);
      return text === "" && !field.required ? undefined : text;
    }
    case "select": {
      const text = checkString(value, where, problems);
      if (!field.options.some((option) => option.value === text)) problems.push(`${where} has an unknown option.`);
      return text === "" ? undefined : text;
    }
    case "number":
      if (typeof value !== "number" || !Number.isFinite(value)) problems.push(`${where} must be a number.`);
      return value;
    case "boolean":
      if (typeof value !== "boolean") problems.push(`${where} must be on or off.`);
      return value === true ? true : undefined;
    case "image": {
      const text = checkString(value, where, problems);
      if (text && !IMAGE_PATH.test(text)) problems.push(`${where} must be an image path under /assets/.`);
      return text || undefined;
    }
    case "tags":
    case "paragraphs":
    case "images": {
      if (!Array.isArray(value)) {
        problems.push(`${where} must be a list.`);
        return value;
      }
      const items = value.map((item, i) => checkString(item, `${where} #${i + 1}`, problems)).filter(Boolean);
      if (field.kind === "images") {
        items.forEach((item, i) => {
          if (!IMAGE_PATH.test(item)) problems.push(`${where} #${i + 1} must be an image path under /assets/.`);
        });
      }
      return items.length || field.required ? items : undefined;
    }
    case "object":
      return checkFields(field.fields, value, where, problems);
    case "list": {
      if (!Array.isArray(value)) {
        problems.push(`${where} must be a list.`);
        return value;
      }
      const items = value.map((item, i) => checkFields(field.fields, item, `${where} #${i + 1}`, problems));
      return items.length || field.required ? items : undefined;
    }
  }
}

/** Validates a whole data file. Returns the cleaned value and any problems. */
export function validateSection(section: DataSection, value: unknown) {
  const problems: Problems = [];
  let cleaned: unknown;
  if (section.root.kind === "object") {
    cleaned = checkFields(section.root.fields, value, "", problems);
  } else if (!Array.isArray(value)) {
    problems.push("Expected a list.");
    cleaned = value;
  } else {
    const root = section.root;
    cleaned = value.map((item, i) => {
      const title = root.itemTitle.map((key) => (item as Record<string, unknown>)?.[key]).find(Boolean);
      return checkFields(root.fields, item, `#${i + 1}${title ? ` (${String(title)})` : ""}`, problems);
    });
    // Slugs must be unique and URL-safe.
    if (root.fields.some((field) => field.key === "slug")) {
      const slugs = (cleaned as { slug?: string }[]).map((item) => item.slug ?? "");
      slugs.forEach((slug, i) => {
        if (slug && !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug)) problems.push(`#${i + 1}: slug "${slug}" isn't URL-safe.`);
        if (slug && slugs.indexOf(slug) !== i) problems.push(`#${i + 1}: slug "${slug}" is used twice.`);
      });
    }
  }
  return { cleaned, problems };
}
