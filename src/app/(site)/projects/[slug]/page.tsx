import Link from "next/link";
import Image from "next/image";
import { notFound } from "next/navigation";
import { MdxContent } from "@/components/mdx-content";
import { GameScreen, GameTags } from "@/components/minecraft/ui";
import { projects } from "@/config/projects";
import { getProjectPost, getProjectPosts } from "@/lib/mdx";

export async function generateStaticParams() {
  return (await getProjectPosts()).map(post => ({ slug: post.slug }));
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const post = await getProjectPost((await params).slug);
  return post ? { title: `${post.title} — Harshdeep Athawale` } : {};
}

export default async function ProjectDetailPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const post = await getProjectPost(slug);
  if (!post) notFound();
  const project = projects.find(item => item.slug === slug);
  return <GameScreen title={post.title} className="mc-project-detail-screen" backHref="/projects">
    <section className="mc-dark-panel mc-scrollbar mc-project-detail-scroll" tabIndex={0} role="region" aria-label={`${post.title} details`}>
      <div className="mc-project-detail-content">
        <header className="mc-detail-card"><span className="mc-detail-date">{post.date}</span><h2>{post.title}</h2><p>{post.description}</p>{post.tech && <GameTags items={post.tech} />}<a className="mc-detail-source" href={project?.href ?? "https://github.com/HarshdeepAthawale"} target="_blank" rel="noopener noreferrer">GitHub ↗</a></header>
        {project?.cover && <div className="mc-detail-card mc-detail-cover"><Image src={project.cover} alt={`${post.title} overview`} width={1200} height={675} sizes="(min-width: 1100px) 1100px, 90vw" priority /></div>}
        {post.writeup && <Link href={post.writeup} className="mc-detail-writeup">Read the full research write-up →</Link>}
        <article className="mc-detail-card prose prose-neutral prose-reading dark:prose-invert"><MdxContent source={post.content} /></article>
      </div>
    </section>
  </GameScreen>;
}
