import { notFound } from "next/navigation";
import { BlogCover } from "@/components/blog-cover";
import { ReadingProgress } from "@/components/blog/reading-progress";
import { TableOfContents } from "@/components/blog/table-of-contents";
import { Container } from "@/components/container";
import { TransitionLink } from "@/components/view-transitions";
import { MdxContent } from "@/components/mdx-content";
import { heroConfig } from "@/config/hero";
import { extractHeadings, readingMinutes } from "@/lib/headings";
import { getBlogPost, getBlogPosts } from "@/lib/mdx";

export async function generateStaticParams() {
  const posts = await getBlogPosts();
  return posts.map((post) => ({ slug: post.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const post = await getBlogPost(slug);
  if (!post) return {};
  return { title: `${post.title} - Blog` };
}

export default async function BlogPostPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const post = await getBlogPost(slug);
  if (!post) notFound();

  const headings = extractHeadings(post.content);
  // Posts are sorted newest first.
  const posts = await getBlogPosts();
  const index = posts.findIndex((item) => item.slug === post.slug);
  const newer = index > 0 ? posts[index - 1] : undefined;
  const older = index >= 0 ? posts[index + 1] : undefined;

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
          cover={post.cover}
          className="mt-6 aspect-[2/1] w-full rounded-2xl"
          transitionName={`cover-${post.slug}`}
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
            <MdxContent source={post.content} />
          </article>
        </div>

        {(newer || older) && (
          <nav
            aria-label="More posts"
            className="mt-16 grid gap-3 border-t border-border pt-8 sm:grid-cols-2"
          >
            {older ? (
              <TransitionLink
                href={`/blog/${older.slug}`}
                className="group rounded-xl border border-border p-4 transition-colors hover:border-foreground/15 hover:bg-card/60"
              >
                <span className="font-mono text-[10px] uppercase tracking-[0.15em] text-secondary">
                  ← Older
                </span>
                <span className="mt-1 block font-display text-base font-medium leading-snug tracking-tight">
                  {older.title}
                </span>
              </TransitionLink>
            ) : (
              <span className="hidden sm:block" />
            )}
            {newer && (
              <TransitionLink
                href={`/blog/${newer.slug}`}
                className="group rounded-xl border border-border p-4 text-right transition-colors hover:border-foreground/15 hover:bg-card/60 sm:col-start-2"
              >
                <span className="font-mono text-[10px] uppercase tracking-[0.15em] text-secondary">
                  Newer →
                </span>
                <span className="mt-1 block font-display text-base font-medium leading-snug tracking-tight">
                  {newer.title}
                </span>
              </TransitionLink>
            )}
          </nav>
        )}
      </Container>
    </div>
  );
}
