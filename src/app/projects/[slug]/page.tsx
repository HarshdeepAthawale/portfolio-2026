import Link from "next/link";
import { notFound } from "next/navigation";
import { Container } from "@/components/container";
import { MdxContent } from "@/components/mdx-content";
import { ProjectScene } from "@/components/project-scene";
import { projects } from "@/config/projects";
import { getProjectPost, getProjectPosts } from "@/lib/mdx";

export async function generateStaticParams() {
  const posts = await getProjectPosts();
  return posts.map((post) => ({ slug: post.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const post = await getProjectPost(slug);
  if (!post) return {};
  return { title: `${post.title} - Projects` };
}

export default async function ProjectDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const post = await getProjectPost(slug);
  if (!post) notFound();

  // Same animated poster as the project's card, so card and page feel connected.
  const scene = projects.find((project) => project.slug === slug)?.scene;

  return (
    <div className="space-y-8 pb-16 pt-8">
      <Container>
        <Link href="/projects" className="text-sm text-secondary hover:text-primary">
          ← Back to projects
        </Link>
        {scene && (
          <div className="relative mt-6 aspect-[16/10] overflow-hidden rounded-2xl border border-border sm:aspect-[2/1]">
            <ProjectScene variant={scene} label={`${post.title} animated poster`} />
          </div>
        )}
        <p className="mt-6 font-mono text-xs text-muted-foreground">{post.date}</p>
        <h1 className="font-display mt-2 text-3xl font-medium tracking-tight">{post.title}</h1>
        <p className="mt-3 text-secondary">{post.description}</p>
        {post.tech && (
          <div className="mt-4 flex flex-wrap gap-2">
            {post.tech.map((tech) => (
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
          <MdxContent source={post.content} />
        </article>
      </Container>
    </div>
  );
}
