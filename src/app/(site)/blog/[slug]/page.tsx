import { notFound } from "next/navigation";
import { BlogArticle } from "@/components/blog/blog-article";
import Link from "next/link";
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

  return <BlogArticle post={post}>
    {(newer || older) && <nav className="blog-more-posts" aria-label="More posts">
      {older && <Link href={`/blog/${older.slug}`}><span>← Older</span>{older.title}</Link>}
      {newer && <Link href={`/blog/${newer.slug}`}><span>Newer →</span>{newer.title}</Link>}
    </nav>}
  </BlogArticle>;
}
