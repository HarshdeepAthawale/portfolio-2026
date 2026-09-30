import { notFound } from "next/navigation";
import { BlogArticle } from "@/components/blog/blog-article";
import { TransitionLink } from "@/components/view-transitions";
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

  // Posts are sorted newest first.
  const posts = await getBlogPosts();
  const index = posts.findIndex((item) => item.slug === post.slug);
  const newer = index > 0 ? posts[index - 1] : undefined;
  const older = index >= 0 ? posts[index + 1] : undefined;

  return (
    <BlogArticle post={post}>
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
    </BlogArticle>
  );
}
