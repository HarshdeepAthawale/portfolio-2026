import matter from "gray-matter";
import { kvDel, kvGet, kvKeys, kvSet } from "@/lib/admin/kv";
import { commitChanges, listRepoDir, readRepoFile, type CommitResult } from "@/lib/admin/repo";
import { COLLECTIONS, isValidSlug, slugify, type Collection } from "@/lib/admin/post-meta";

export { COLLECTIONS, isValidSlug, slugify, type Collection };

/**
 * Blog posts and project write-ups are MDX files in content/<collection>/.
 * Drafts live in the admin store (the repo is public, so unpublished work never
 * touches git). Publishing commits the file; the site redeploys with it.
 */

export type Frontmatter = {
  title: string;
  description: string;
  date: string;
  cover?: string;
  /** Blog: where it was first published (e.g. Medium). */
  original?: string;
  /** Projects: tech chips. */
  tech?: string[];
  /** Projects: path to the blog post with the full story. */
  writeup?: string;
};

export type PostDoc = {
  collection: Collection;
  slug: string;
  frontmatter: Frontmatter;
  body: string;
  /** Blob sha of the published file, or null if it has never been published. */
  sha: string | null;
};

export type Draft = PostDoc & { updatedAt: number };

export type PostSummary = {
  collection: Collection;
  slug: string;
  title: string;
  date: string;
  published: boolean;
  hasDraft: boolean;
  draftUpdatedAt?: number;
};

const FRONTMATTER_ORDER: (keyof Frontmatter)[] = [
  "title",
  "description",
  "date",
  "tech",
  "cover",
  "original",
  "writeup",
];

export function isCollection(value: string): value is Collection {
  return value in COLLECTIONS;
}

const filePath = (collection: Collection, slug: string) =>
  `${COLLECTIONS[collection].dir}/${slug}.mdx`;
const draftKey = (collection: Collection, slug: string) => `admin:draft:${collection}:${slug}`;

function normalizeFrontmatter(data: Record<string, unknown>): Frontmatter {
  const text = (value: unknown) => (value === undefined || value === null ? "" : String(value));
  return {
    title: text(data.title),
    description: text(data.description),
    date: text(data.date),
    cover: text(data.cover) || undefined,
    original: text(data.original) || undefined,
    tech: Array.isArray(data.tech) ? data.tech.map(String).filter(Boolean) : undefined,
    writeup: text(data.writeup) || undefined,
  };
}

/** Writes frontmatter the way the existing files do: JSON-quoted YAML values. */
export function serializePost(frontmatter: Frontmatter, body: string) {
  const lines = ["---"];
  for (const key of FRONTMATTER_ORDER) {
    const value = frontmatter[key];
    if (value === undefined || value === "" || (Array.isArray(value) && value.length === 0)) continue;
    const yaml = Array.isArray(value)
      ? `[${value.map((item) => JSON.stringify(item)).join(", ")}]`
      : JSON.stringify(value);
    lines.push(`${key}: ${yaml}`);
  }
  lines.push("---", "");
  return `${lines.join("\n")}\n${body.replace(/^\n+/, "").replace(/\s*$/, "")}\n`;
}

/** Returns a list of problems; empty means publishable. */
export function validatePost(collection: Collection, frontmatter: Frontmatter, body: string) {
  const errors: string[] = [];
  const url = /^(https?:\/\/|\/)[^\s"<>]*$/;
  if (!frontmatter.title.trim()) errors.push("Title is required.");
  if (frontmatter.title.length > 200) errors.push("Title is too long (200 max).");
  if (!frontmatter.description.trim()) errors.push("Description is required.");
  if (frontmatter.description.length > 400) errors.push("Description is too long (400 max).");
  if (!frontmatter.date.trim()) errors.push("Date is required.");
  if (frontmatter.cover && !/^\/assets\/[^\s"<>]+$/.test(frontmatter.cover)) {
    errors.push("Cover must be a site image path like /assets/uploads/photo.webp.");
  }
  if (frontmatter.original && !/^https:\/\/[^\s"<>]+$/.test(frontmatter.original)) {
    errors.push("Original URL must start with https://.");
  }
  if (frontmatter.writeup && !url.test(frontmatter.writeup)) errors.push("Write-up must be a URL or path.");
  if (collection === "blog" && frontmatter.tech?.length) errors.push("Blog posts don't use tech tags.");
  if (!body.trim()) errors.push("The post body is empty.");
  if (body.length > 200_000) errors.push("The post body is too long.");
  return errors;
}

function parsePost(collection: Collection, slug: string, raw: string, sha: string | null): PostDoc {
  const { data, content } = matter(raw);
  return {
    collection,
    slug,
    frontmatter: normalizeFrontmatter(data),
    body: content.replace(/^\n+/, ""),
    sha,
  };
}

export async function getPublishedPost(collection: Collection, slug: string): Promise<PostDoc | null> {
  const file = await readRepoFile(filePath(collection, slug));
  return file ? parsePost(collection, slug, file.content.toString("utf8"), file.sha) : null;
}

export async function getDraft(collection: Collection, slug: string) {
  return kvGet<Draft>(draftKey(collection, slug));
}

/** What the editor should open: the draft if there is one, else the published file. */
export async function getEditablePost(collection: Collection, slug: string) {
  const [draft, published] = await Promise.all([
    getDraft(collection, slug),
    getPublishedPost(collection, slug),
  ]);
  return { draft, published };
}

export async function saveDraft(draft: Omit<Draft, "updatedAt">) {
  const saved: Draft = { ...draft, updatedAt: Date.now() };
  await kvSet(draftKey(draft.collection, draft.slug), saved);
  return saved;
}

export async function discardDraft(collection: Collection, slug: string) {
  await kvDel(draftKey(collection, slug));
}

export async function publishPost(
  collection: Collection,
  slug: string,
  frontmatter: Frontmatter,
  body: string,
  expectedSha: string | null,
): Promise<CommitResult> {
  const verb = expectedSha ? "update" : "publish";
  const result = await commitChanges(
    [{ path: filePath(collection, slug), content: serializePost(frontmatter, body), expectedSha }],
    `${collection === "blog" ? "blog" : "projects"}: ${verb} ${slug}`,
  );
  await discardDraft(collection, slug);
  return result;
}

export async function unpublishPost(collection: Collection, slug: string, expectedSha: string) {
  return commitChanges(
    [{ path: filePath(collection, slug), content: null, expectedSha }],
    `${collection === "blog" ? "blog" : "projects"}: remove ${slug}`,
  );
}

export async function listPosts(collection: Collection): Promise<PostSummary[]> {
  const [files, draftKeys] = await Promise.all([
    listRepoDir(COLLECTIONS[collection].dir),
    kvKeys(`admin:draft:${collection}:`),
  ]);

  const published = await Promise.all(
    files
      .filter((file) => file.name.endsWith(".mdx"))
      .map(async (file) => {
        const slug = file.name.replace(/\.mdx$/, "");
        const doc = await getPublishedPost(collection, slug);
        return doc!;
      }),
  );
  const drafts = (
    await Promise.all(draftKeys.map((key) => kvGet<Draft>(key)))
  ).filter((draft): draft is Draft => Boolean(draft));

  const summaries = new Map<string, PostSummary>();
  for (const doc of published) {
    summaries.set(doc.slug, {
      collection,
      slug: doc.slug,
      title: doc.frontmatter.title || doc.slug,
      date: doc.frontmatter.date,
      published: true,
      hasDraft: false,
    });
  }
  for (const draft of drafts) {
    const existing = summaries.get(draft.slug);
    summaries.set(draft.slug, {
      collection,
      slug: draft.slug,
      title: draft.frontmatter.title || existing?.title || "Untitled",
      date: draft.frontmatter.date || existing?.date || "",
      published: Boolean(existing),
      hasDraft: true,
      draftUpdatedAt: draft.updatedAt,
    });
  }

  // Unpublished drafts first (most recently edited), then published by date.
  return [...summaries.values()].sort((a, b) => {
    if (a.published !== b.published) return a.published ? 1 : -1;
    if (!a.published) return (b.draftUpdatedAt ?? 0) - (a.draftUpdatedAt ?? 0);
    const ta = Date.parse(a.date);
    const tb = Date.parse(b.date);
    if (!Number.isNaN(ta) && !Number.isNaN(tb)) return tb - ta;
    return a.date < b.date ? 1 : -1;
  });
}
