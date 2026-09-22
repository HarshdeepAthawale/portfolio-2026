import type { MetadataRoute } from "next";
import { achievements } from "@/config/achievements";
import { siteConfig } from "@/config/meta";
import { getBlogPosts, getProjectPosts } from "@/lib/mdx";

const staticRoutes = [
  "",
  "/about",
  "/projects",
  "/work",
  "/blog",
  "/achievements",
  "/resume",
  "/books",
  "/movies",
  "/favourites",
];

function toDate(value: string) {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? undefined : date;
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = siteConfig.url;
  const [posts, projects] = await Promise.all([getBlogPosts(), getProjectPosts()]);

  return [
    ...staticRoutes.map((route) => ({
      url: `${base}${route}`,
      changeFrequency: "monthly" as const,
      priority: route === "" ? 1 : 0.7,
    })),
    ...posts.map((post) => ({
      url: `${base}/blog/${post.slug}`,
      lastModified: toDate(post.date),
      priority: 0.6,
    })),
    ...projects.map((project) => ({
      url: `${base}/projects/${project.slug}`,
      lastModified: toDate(project.date),
      priority: 0.6,
    })),
    ...achievements.map((item) => ({
      url: `${base}/achievements/${item.slug}`,
      priority: 0.5,
    })),
  ];
}
