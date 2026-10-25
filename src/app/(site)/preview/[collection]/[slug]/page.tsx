import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { BlogArticle } from "@/components/blog/blog-article";
import { GameScreen, GameTags } from "@/components/minecraft/ui";
import { GameScroll } from "@/components/minecraft/game-scroll";
import { MdxContent } from "@/components/mdx-content";
import { getEditablePost, isCollection, isValidSlug } from "@/lib/admin/posts";
import { requireAdmin } from "@/lib/admin/session";
import { mdxCompileError } from "@/lib/mdx-options";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Preview",
  robots: { index: false, follow: false },
};

// Uploads may not be deployed yet, so the preview loads them from the repo.
function previewSrc(src: string) {
  return src.startsWith("/assets/uploads/") ? `/api/admin/media/${src.slice("/assets/".length)}` : src;
}

/** The draft (or published version) of a post, rendered exactly as the site will. */
export default async function PreviewPage({
  params,
}: {
  params: Promise<{ collection: string; slug: string }>;
}) {
  await requireAdmin();
  const { collection, slug } = await params;
  if (!isCollection(collection) || !isValidSlug(slug)) notFound();

  const { draft, published } = await getEditablePost(collection, slug);
  const doc = draft ?? published;
  if (!doc) notFound();

  const compileError = await mdxCompileError(doc.body);
  if (compileError) {
    return <GameScreen title="Preview" backHref="/projects">
      <GameScroll className="mc-dark-panel mc-collection-scroll" aria-label="Draft compile error">
        <div className="mc-collection-content mc-detail-card"><h2>This draft doesn’t compile yet</h2><pre className="mc-preview-error">{compileError}</pre></div>
      </GameScroll>
    </GameScreen>;
  }

  const fm = doc.frontmatter;
  if (collection === "blog") {
    return (
      <BlogArticle
        post={{ slug, content: doc.body, ...fm, title: fm.title || "Untitled" }}
        mapSrc={previewSrc}
      />
    );
  }

  return <GameScreen title={fm.title || "Untitled"} backHref="/projects" className="mc-project-detail-screen">
    <GameScroll className="mc-dark-panel mc-project-detail-scroll" aria-label="Project draft preview">
      <div className="mc-project-detail-content">
        <header className="mc-detail-card"><span className="mc-detail-date">{fm.date}</span><h2>{fm.title || "Untitled"}</h2><p>{fm.description}</p>{fm.tech && <GameTags items={fm.tech} />}</header>
        <article className="mc-detail-card prose prose-neutral prose-reading dark:prose-invert"><MdxContent source={doc.body} mapSrc={previewSrc} /></article>
      </div>
    </GameScroll>
  </GameScreen>;
}
