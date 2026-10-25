import { MinecraftBlog } from "@/components/minecraft/blog-list";
import { getBlogPosts } from "@/lib/mdx";

export const metadata = { title: "Blog — Harshdeep Athawale" };
export default async function BlogPage() {
  const posts = await getBlogPosts();
  return <MinecraftBlog posts={posts.map(post => ({ slug: post.slug, title: post.title, description: post.description, date: post.date, cover: post.cover }))} />;
}
