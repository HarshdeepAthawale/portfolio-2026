"use server";

import { run } from "@/app/admin/_actions/result";
import {
  discardDraft,
  getDraft,
  getPublishedPost,
  isCollection,
  isValidSlug,
  publishPost,
  saveDraft,
  unpublishPost,
  validatePost,
  type Collection,
  type Frontmatter,
} from "@/lib/admin/posts";
import { ConflictError } from "@/lib/admin/repo";
import { mdxCompileError } from "@/lib/mdx-options";
import { assertAdmin } from "@/lib/admin/session";

export type EditorPayload = {
  collection: string;
  slug: string;
  /** True while the post has never been published (its slug can still change). */
  isNew: boolean;
  frontmatter: Frontmatter;
  body: string;
  /** Blob sha of the published file the editor started from, or null. */
  baseSha: string | null;
};

const clip = (value: unknown, max: number) => String(value ?? "").slice(0, max);

/** Never trust the client's shape: rebuild the payload field by field. */
function parse(input: EditorPayload) {
  if (!isCollection(input.collection)) throw new Error("Unknown collection.");
  if (!isValidSlug(input.slug)) {
    throw new Error("The slug must be lowercase words joined by hyphens (e.g. my-first-post).");
  }
  const fm = input.frontmatter ?? ({} as Frontmatter);
  const frontmatter: Frontmatter = {
    title: clip(fm.title, 200),
    description: clip(fm.description, 400),
    date: clip(fm.date, 40),
    cover: clip(fm.cover, 300) || undefined,
    original: clip(fm.original, 500) || undefined,
    writeup: clip(fm.writeup, 300) || undefined,
    tech: Array.isArray(fm.tech) ? fm.tech.map((t) => clip(t, 60)).filter(Boolean).slice(0, 30) : undefined,
  };
  const baseSha = typeof input.baseSha === "string" && /^[0-9a-f]{40}$/.test(input.baseSha) ? input.baseSha : null;
  return {
    collection: input.collection as Collection,
    slug: input.slug,
    isNew: Boolean(input.isNew),
    frontmatter,
    body: clip(input.body, 200_000),
    baseSha,
  };
}

export async function saveDraftAction(input: EditorPayload, previousSlug?: string) {
  return run(async () => {
    await assertAdmin();
    const post = parse(input);
    if (post.isNew) {
      // A new post can't shadow a published one; renaming it moves its draft.
      if (await getPublishedPost(post.collection, post.slug)) {
        throw new ConflictError(`"${post.slug}" is already published. Pick another slug.`);
      }
      if (previousSlug && previousSlug !== post.slug) {
        if (await getDraft(post.collection, post.slug)) {
          throw new ConflictError(`"${post.slug}" is already used by another draft.`);
        }
        if (isValidSlug(previousSlug)) await discardDraft(post.collection, previousSlug);
      }
    }
    const saved = await saveDraft({
      collection: post.collection,
      slug: post.slug,
      frontmatter: post.frontmatter,
      body: post.body,
      sha: post.baseSha,
    });
    return { updatedAt: saved.updatedAt };
  });
}

export async function checkSlugAction(collection: string, slug: string) {
  return run(async () => {
    await assertAdmin();
    if (!isCollection(collection) || !isValidSlug(slug)) return { free: false };
    const [published, draft] = await Promise.all([
      getPublishedPost(collection, slug),
      getDraft(collection, slug),
    ]);
    return { free: !published && !draft };
  });
}

export async function publishAction(input: EditorPayload) {
  return run(async () => {
    await assertAdmin();
    const post = parse(input);
    const errors = validatePost(post.collection, post.frontmatter, post.body);
    const compileError = await mdxCompileError(post.body);
    if (compileError) errors.push(`The MDX doesn't compile: ${compileError}`);
    if (errors.length) throw new Error(errors.join(" "));

    // New posts must not overwrite an existing file (expectedSha null = must not exist).
    const result = await publishPost(post.collection, post.slug, post.frontmatter, post.body, post.baseSha);
    console.info(`[admin] published ${post.collection}/${post.slug}`);
    const published = await getPublishedPost(post.collection, post.slug);
    return { commitUrl: result.url ?? null, sha: published?.sha ?? null };
  });
}

export async function discardDraftAction(collection: string, slug: string) {
  return run(async () => {
    await assertAdmin();
    if (!isCollection(collection) || !isValidSlug(slug)) throw new Error("Unknown post.");
    await discardDraft(collection, slug);
    return {};
  });
}

export async function unpublishAction(collection: string, slug: string, sha: string) {
  return run(async () => {
    await assertAdmin();
    if (!isCollection(collection) || !isValidSlug(slug)) throw new Error("Unknown post.");
    if (!/^[0-9a-f]{40}$/.test(sha)) throw new Error("Missing version; reload the page.");
    const result = await unpublishPost(collection, slug, sha);
    console.info(`[admin] removed ${collection}/${slug}`);
    return { commitUrl: result.url ?? null };
  });
}
