import { BlogCover } from "@/components/blog-cover";
import { ReadingProgress } from "@/components/blog/reading-progress";
import { TableOfContents } from "@/components/blog/table-of-contents";
import { Container } from "@/components/container";
import { MdxContent } from "@/components/mdx-content";
import { TransitionLink } from "@/components/view-transitions";
import { heroConfig } from "@/config/hero";
import { extractHeadings, readingMinutes } from "@/lib/headings";

export type ArticlePost = {
  slug: string;
  title: string;
  description: string;
  date: string;
  cover?: string;
  original?: string;
  content: string;
};

/**
 * A blog post page. Shared by the live post and the admin preview, so what you
 * preview is exactly what gets published.
 */
export function BlogArticle({
  post,
  mapSrc,
  children,
}: {
  post: ArticlePost;
  /** Rewrites image URLs (the preview serves not-yet-deployed uploads). */
  mapSrc?: (src: string) => string;
  /** Rendered after the article (e.g. older/newer links). */
  children?: React.ReactNode;
}) {
  const headings = extractHeadings(post.content);
  const cover = post.cover && mapSrc ? mapSrc(post.cover) : post.cover;

  return (
    <div className="pb-16 pt-8">
      <ReadingProgress targetId="post-body" />
      <Container className="max-w-2xl">
        <TransitionLink
          href="/blog"
          className="text-sm text-secondary transition-colors hover:text-foreground"
        >
          ← Back to blog
        </TransitionLink>

        <BlogCover
          title={post.title}
          cover={cover}
          className="mt-6 aspect-[2/1] w-full rounded-2xl"
          transitionName={`cover-${post.slug}`}
          unoptimized={Boolean(mapSrc)}
          priority
        />

        <header className="mt-8">
          <p className="font-mono text-xs uppercase tracking-[0.15em] text-secondary">
            {post.date} · {readingMinutes(post.content)} min read
          </p>
          <h1 className="font-display mt-3 text-3xl font-medium tracking-tight sm:text-4xl">{post.title}</h1>
          <p className="mt-2 text-sm text-secondary">
            {heroConfig.name}
            {post.original && (
              <>
                {" · Originally published on "}
                <a
                  href={post.original}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="link-underline text-foreground"
                >
                  Medium ↗
                </a>
              </>
            )}
          </p>
          <p className="mt-4 text-base leading-relaxed text-secondary sm:text-lg">
            {post.description}
          </p>
        </header>

        <div className="relative">
          {/* On wide screens, a table of contents rides alongside the article. */}
          {headings.length > 1 && (
            <aside className="absolute left-full top-10 ml-12 hidden h-[calc(100%-2.5rem)] w-48 xl:block">
              <div className="sticky top-24">
                <TableOfContents headings={headings} />
              </div>
            </aside>
          )}
          <article
            id="post-body"
            className="prose prose-neutral prose-reading dark:prose-invert mt-10 border-t border-border pt-10"
          >
            <MdxContent source={post.content} mapSrc={mapSrc} />
          </article>
        </div>

        {children}
      </Container>
    </div>
  );
}
