import Link from "next/link";
import { ArrowUpRight } from "@phosphor-icons/react/dist/ssr";
import { BlogCover } from "@/components/blog-cover";
import { Container } from "@/components/container";
import { getBlogPosts } from "@/lib/mdx";

export const metadata = {
  title: "Blog - Harshdeep Athawale",
};

export default async function BlogPage() {
  const posts = await getBlogPosts();

  return (
    <div className="space-y-10 pb-16 pt-8">
      <Container>
        <h1 className="font-display text-3xl font-medium tracking-tight">Blog</h1>
        <p className="mt-3 text-secondary">
          Bug bounty writeups, security research, and lessons from the hunt.
        </p>
      </Container>

      <Container>
        <div className="flex flex-col gap-8">
          {posts.map((post) => (
            <Link
              key={post.slug}
              href={`/blog/${post.slug}`}
              className="group block overflow-hidden rounded-2xl border border-border bg-card shadow-sm transition-colors hover:bg-card/80"
            >
              <BlogCover
                title={post.title}
                cover={post.cover}
                className="aspect-[2/1] w-full"
              />
              <div className="p-5 sm:p-6">
                <div className="flex items-start justify-between gap-3">
                  <p className="text-xs uppercase tracking-wider text-secondary">{post.date}</p>
                  <ArrowUpRight className="size-4 shrink-0 text-secondary opacity-0 transition-opacity group-hover:opacity-100" />
                </div>
                <h2 className="mt-2 text-xl font-bold tracking-tight sm:text-2xl">
                  {post.title}
                </h2>
                <p className="mt-3 text-sm leading-relaxed text-secondary sm:text-base">
                  {post.description}
                </p>
              </div>
            </Link>
          ))}
        </div>
      </Container>
    </div>
  );
}
