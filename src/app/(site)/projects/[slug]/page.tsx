import Link from "next/link";
import { notFound } from "next/navigation";
import { Container } from "@/components/container";
import { MdxContent } from "@/components/mdx-content";
import { ParticleField } from "@/components/particle-field";
import { TransitionLink } from "@/components/view-transitions";
import { projectScenes, projects } from "@/config/projects";
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
  const sceneKey = projects.find((project) => project.slug === slug)?.scene;
  const scene = sceneKey ? projectScenes[sceneKey] : undefined;

  return (
    <div className="space-y-8 pb-16 pt-8">
      <Container>
        <TransitionLink href="/projects" className="text-sm text-secondary hover:text-primary">
          ← Back to projects
        </TransitionLink>
        {scene && (
          <div
            className="dark corner-frame relative mt-6 aspect-[16/10] overflow-hidden bg-background text-foreground sm:aspect-[2/1]"
            style={{ viewTransitionName: `poster-${slug}` }}
          >
            <ParticleField shape={scene.shape} />
            <span className="absolute left-4 top-4 flex items-center gap-2 font-mono text-[10px] uppercase tracking-[0.15em] text-foreground/80">
              <span aria-hidden className="size-1.5 rounded-full bg-sun" />
              {scene.status}
            </span>
            <span className="chip-live absolute bottom-4 right-4 bg-background/70">{scene.badge}</span>
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
                className="rounded-sm border border-border bg-muted px-2.5 py-1 font-mono text-[11px]"
              >
                {tech}
              </span>
            ))}
          </div>
        )}
        {post.writeup && (
          <Link
            href={post.writeup}
            className="link-underline mt-5 inline-flex items-center gap-1.5 text-sm font-medium"
          >
            Read the full write-up
            <span aria-hidden>→</span>
          </Link>
        )}
        <article className="prose prose-neutral prose-reading dark:prose-invert mt-8">
          <MdxContent source={post.content} />
        </article>
      </Container>
    </div>
  );
}
