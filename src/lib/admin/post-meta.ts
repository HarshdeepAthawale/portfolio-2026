// Post metadata shared by the editor (client) and the server.

export const COLLECTIONS = {
  blog: { label: "Blog posts", singular: "Post", dir: "content/blog", publicPath: "/blog" },
  projects: {
    label: "Project write-ups",
    singular: "Write-up",
    dir: "content/projects",
    publicPath: "/projects",
  },
} as const;

export type Collection = keyof typeof COLLECTIONS;

// Post slugs are URL path segments.
const SLUG = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

export function isValidSlug(slug: string) {
  return slug.length <= 80 && SLUG.test(slug);
}

export function slugify(text: string) {
  return text
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80)
    .replace(/-+$/g, "");
}
