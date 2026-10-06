import Image from "next/image";
import Link from "next/link";
import { ArrowUpRight, GithubLogo, Globe } from "@phosphor-icons/react/dist/ssr";
import { Container } from "@/components/container";
import { ParticleField } from "@/components/particle-field";
import { SectionHeading } from "@/components/section-heading";
import { TransitionLink } from "@/components/view-transitions";
import { projects, projectScenes, type Project } from "@/config/projects";

export function ProjectCard({ project, index = 0 }: { project: Project; index?: number }) {
  const scene = project.scene ? projectScenes[project.scene] : undefined;
  const mark = project.monogram ?? project.title.slice(0, 2).toUpperCase();

  return (
    <article
      className="animate-in-up-on-view group flex flex-col border border-border bg-card p-3 transition-colors duration-300 hover:border-foreground/25"
      style={{ animationDelay: `${index * 0.05}s` }}
    >
      {/* Poster opens the project page; the shared view-transition-name lets it
          glide into the page header. */}
      <TransitionLink
        href={`/projects/${project.slug}`}
        aria-label={`Open ${project.title}`}
        className="corner-frame relative block aspect-[16/10] overflow-hidden bg-muted text-foreground dark:bg-background"
        style={{ viewTransitionName: `poster-${project.slug}` }}
      >
        {scene ? (
          // Keep the figure clear of the label (top) and badge (bottom).
          <div className="absolute inset-x-0 bottom-10 top-9">
            <ParticleField shape={scene.shape} />
          </div>
        ) : project.cover ? (
          <Image
            src={project.cover}
            alt={`${project.title} cover`}
            fill
            sizes="(max-width: 640px) 100vw, 400px"
            className="object-cover transition-transform duration-500 group-hover:scale-[1.03]"
          />
        ) : (
          <span className="absolute inset-0 flex items-center justify-center font-display text-5xl text-foreground/70">
            {mark}
          </span>
        )}
        {scene && (
          <>
            <span className="absolute left-3 top-3 flex items-center gap-2 font-mono text-[10px] uppercase tracking-[0.15em] text-foreground/80">
              <span aria-hidden className="size-1.5 rounded-full bg-sun" />
              {scene.status}
            </span>
            <span className="chip-live absolute bottom-3 right-3 bg-background/70">{scene.badge}</span>
          </>
        )}
      </TransitionLink>

      <div className="flex flex-1 flex-col px-1 pb-1 pt-4">
        <div className="flex items-baseline justify-between gap-3">
          <h3 className="font-display text-2xl leading-tight">
            <TransitionLink
              href={`/projects/${project.slug}`}
              className="transition-colors hover:text-sun"
            >
              {project.title}
            </TransitionLink>
          </h3>
          <span className="shrink-0 font-mono text-[10px] uppercase tracking-[0.12em] text-secondary">
            {project.date}
          </span>
        </div>

        <p className="mt-2 line-clamp-3 text-sm leading-relaxed text-secondary">{project.description}</p>

        <div className="mt-auto flex items-end justify-between gap-3 pt-4">
          <ul className="flex flex-wrap gap-1.5" aria-label="Built with">
            {project.tech.map((tech) => (
              <li
                key={tech}
                className="rounded-sm border border-border px-1.5 py-0.5 font-mono text-[10px] uppercase tracking-[0.08em] text-secondary"
              >
                {tech}
              </li>
            ))}
          </ul>
          <div className="flex shrink-0 items-center gap-1">
            {project.website && (
              <Link
                href={project.website}
                target="_blank"
                rel="noopener noreferrer"
                aria-label={`Visit ${project.title}`}
                className="rounded-sm p-1 text-secondary transition-colors hover:text-foreground"
              >
                <Globe className="size-4" />
              </Link>
            )}
            <Link
              href={project.href}
              target="_blank"
              rel="noopener noreferrer"
              aria-label={`${project.title} on GitHub`}
              className="rounded-sm p-1 text-secondary transition-colors hover:text-foreground"
            >
              <GithubLogo className="size-4" />
            </Link>
          </div>
        </div>
      </div>
    </article>
  );
}

export function ProjectsGrid({
  items,
  limit,
  showHeading = true,
  showViewAll = false,
  index,
}: {
  items?: Project[];
  limit?: number;
  showHeading?: boolean;
  showViewAll?: boolean;
  index?: number;
}) {
  const source = items ?? projects;
  const list = limit && !items ? source.filter((p) => p.featured) : source;
  const displayed = limit ? list.slice(0, limit) : list;

  return (
    <Container>
      {showHeading && (
        <div className="mb-4 flex items-end justify-between gap-4">
          <SectionHeading title="Featured Projects" uppercase className="mb-0" index={index} />
          {showViewAll && (
            <Link
              href="/projects"
              className="inline-flex shrink-0 items-center gap-1 font-mono text-xs uppercase tracking-[0.15em] text-secondary transition-colors hover:text-foreground"
            >
              View all
              <ArrowUpRight className="size-3.5" />
            </Link>
          )}
        </div>
      )}

      <div className="grid gap-5 sm:grid-cols-2">
        {displayed.map((project, index) => (
          <ProjectCard key={project.slug} project={project} index={index} />
        ))}
      </div>
    </Container>
  );
}
