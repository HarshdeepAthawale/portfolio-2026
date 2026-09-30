import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { PostEditor } from "@/app/admin/_components/post-editor";
import { getEditablePost, isCollection, isValidSlug, type Frontmatter } from "@/lib/admin/posts";

export const metadata: Metadata = { title: "Editor" };

function defaultDate() {
  return new Date().toLocaleDateString("en-US", { month: "short", year: "numeric", timeZone: "Asia/Kolkata" });
}

export default async function EditorPage({
  params,
}: {
  params: Promise<{ collection: string; slug: string }>;
}) {
  const { collection, slug } = await params;
  if (!isCollection(collection)) notFound();

  if (slug === "new") {
    const frontmatter: Frontmatter = { title: "", description: "", date: defaultDate() };
    return (
      <PostEditor
        collection={collection}
        initial={{ slug: "", frontmatter, body: "", baseSha: null, isNew: true, hasDraft: false, updatedAt: null }}
      />
    );
  }

  if (!isValidSlug(slug)) notFound();
  const { draft, published } = await getEditablePost(collection, slug);
  const doc = draft ?? published;
  if (!doc) notFound();

  return (
    <PostEditor
      collection={collection}
      initial={{
        slug,
        frontmatter: doc.frontmatter,
        body: doc.body,
        // The version edits are based on: the draft remembers what it started from.
        baseSha: draft ? draft.sha : published!.sha,
        isNew: !published,
        hasDraft: Boolean(draft),
        updatedAt: draft?.updatedAt ?? null,
        publishedSha: published?.sha ?? null,
      }}
    />
  );
}
