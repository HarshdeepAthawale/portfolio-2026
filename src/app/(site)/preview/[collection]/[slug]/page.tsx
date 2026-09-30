import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { BlogArticle } from "@/components/blog/blog-article";
import { Container } from "@/components/container";
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
    return (
      <Container className="max-w-2xl py-16">
        <p className="font-mono text-xs uppercase tracking-[0.15em] text-secondary">Preview</p>
        <h1 className="font-display mt-2 text-2xl font-medium tracking-tight">
          This draft doesn&apos;t compile yet
        </h1>
        <pre className="mt-4 whitespace-pre-wrap rounded-xl border border-border bg-muted p-4 font-mono text-sm">
          {compileError}
        </pre>
      </Container>
    );
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

  return (
    <div className="pb-16 pt-8">
      <Container>
        <p className="font-mono text-xs text-muted-foreground">{fm.date}</p>
        <h1 className="font-display mt-2 text-3xl font-medium tracking-tight">{fm.title || "Untitled"}</h1>
        <p className="mt-3 text-secondary">{fm.description}</p>
        {fm.tech && (
          <div className="mt-4 flex flex-wrap gap-2">
            {fm.tech.map((tech) => (
              <span
                key={tech}
                className="rounded-full border border-border bg-muted px-2.5 py-1 font-mono text-[11px]"
              >
                {tech}
              </span>
            ))}
          </div>
        )}
        <article className="prose prose-neutral prose-reading dark:prose-invert mt-8">
          <MdxContent source={doc.body} mapSrc={previewSrc} />
        </article>
      </Container>
    </div>
  );
}
