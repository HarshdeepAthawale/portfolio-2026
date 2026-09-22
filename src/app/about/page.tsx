import Image from "next/image";
import Link from "next/link";
import {
  EnvelopeSimple,
  GithubLogo,
  LinkedinLogo,
  XLogo,
} from "@phosphor-icons/react/dist/ssr";
import { Container } from "@/components/container";
import { HighlightedText } from "@/components/highlighted-text";
import { aboutConfig } from "@/config/about";
import { cn } from "@/lib/utils";

const severityStyles: Record<string, string> = {
  critical:
    "border-rose-200 bg-rose-50 text-rose-700 dark:border-rose-900/50 dark:bg-rose-950/40 dark:text-rose-300",
  high: "border-amber-200 bg-amber-50 text-amber-800 dark:border-amber-900/50 dark:bg-amber-950/40 dark:text-amber-300",
  // Bug class, not a severity score - kept neutral so color only marks real CVSS.
  neutral:
    "border-stone-300 bg-stone-100 text-stone-700 dark:border-stone-700 dark:bg-stone-900/60 dark:text-stone-300",
};

const connectIconMap = {
  mail: EnvelopeSimple,
  linkedin: LinkedinLogo,
  github: GithubLogo,
  x: XLogo,
};

export const metadata = {
  title: "About - Harshdeep Athawale",
  description: aboutConfig.intro.replace(/\*\*/g, ""),
};

export default function AboutPage() {
  return (
    <div className="space-y-16 pb-20 pt-8">
      <Container>
        <div className="max-w-2xl space-y-8">
          <div className="grid gap-6 sm:grid-cols-[1fr_auto] sm:items-start sm:gap-8">
            <div className="space-y-4">
              <h1 className="font-display text-3xl font-medium tracking-tight sm:text-4xl">
                {aboutConfig.headline[0]}
                <br />
                {aboutConfig.headline[1]}
              </h1>
              <p className="text-base leading-relaxed text-secondary sm:text-lg">
                <HighlightedText text={aboutConfig.intro} />
              </p>
            </div>

            <figure className="w-36 shrink-0 sm:w-44 md:w-52">
              <div className="group relative aspect-[3/4] overflow-hidden rounded-2xl border border-border bg-muted">
                <Image
                  src={aboutConfig.portrait.src}
                  alt={aboutConfig.portrait.alt}
                  fill
                  sizes="(max-width: 640px) 144px, (max-width: 768px) 176px, 208px"
                  className="object-cover transition-transform duration-500 group-hover:scale-105"
                  priority
                />
              </div>
              <figcaption className="mt-2 text-xs text-secondary">
                {aboutConfig.portrait.caption}
              </figcaption>
            </figure>
          </div>

          <blockquote className="border-l-2 border-border pl-4 text-sm italic leading-relaxed text-secondary sm:text-base">
            {aboutConfig.quote}
          </blockquote>

          <div className="relative flex flex-wrap items-center gap-2 py-1">
            <div
              aria-hidden
              className="pointer-events-none absolute inset-x-0 top-1/2 h-px -translate-y-1/2 bg-border"
            />
            {aboutConfig.traits.map((trait) => (
              <span
                key={trait}
                className={`relative rounded-full border px-3 py-1 text-xs font-medium ${aboutConfig.traitStyles[trait]}`}
              >
                {trait}
              </span>
            ))}
          </div>

          <div className="grid grid-cols-2 gap-4 border-t border-border pt-6 sm:grid-cols-4">
            {aboutConfig.meta.map((item) => (
              <div key={item.label}>
                <p className="font-mono text-xs uppercase tracking-[0.15em] text-secondary">
                  {item.label}
                </p>
                <p className="mt-1 text-sm font-medium">{item.value}</p>
              </div>
            ))}
          </div>
        </div>
      </Container>

      <Container>
        <section className="max-w-2xl space-y-5">
          <h2 className="font-display text-xl font-medium tracking-tight">{aboutConfig.story.title}</h2>
          <div className="space-y-4 text-sm leading-relaxed text-secondary sm:text-base">
            {aboutConfig.story.paragraphs.map((paragraph) => (
              <p key={paragraph}>
                <HighlightedText text={paragraph} />
              </p>
            ))}
          </div>
        </section>
      </Container>

      <Container>
        <section className="max-w-2xl space-y-6">
          <h2 className="font-display text-xl font-medium tracking-tight">{aboutConfig.findings.title}</h2>
          <div className="grid gap-3 sm:grid-cols-2">
            {aboutConfig.findings.items.map((item) => (
              <div
                key={item.org}
                className="rounded-xl border border-border bg-card/60 p-4 transition-all duration-300 hover:-translate-y-1 hover:border-foreground/15 hover:bg-card/80 hover:shadow-md"
              >
                <div className="flex items-center justify-between gap-2">
                  <h3 className="font-display text-base font-medium tracking-tight">{item.org}</h3>
                  <span
                    className={cn(
                      "shrink-0 rounded-full border px-2 py-0.5 font-mono text-[10px] uppercase tracking-wide",
                      severityStyles[item.tier],
                    )}
                  >
                    {item.severity}
                  </span>
                </div>
                <p className="mt-2 text-sm leading-relaxed text-secondary">{item.text}</p>
              </div>
            ))}
          </div>
        </section>
      </Container>

      <Container>
        <section className="max-w-2xl space-y-6">
          <h2 className="font-display text-xl font-medium tracking-tight">{aboutConfig.built.title}</h2>
          <div className="space-y-3">
            {aboutConfig.built.items.map((item) => (
              <div
                key={item.title}
                className="rounded-xl border border-border bg-card/60 p-4 transition-all duration-300 hover:-translate-y-0.5 hover:border-foreground/15 hover:bg-card/80 hover:shadow-md"
              >
                <h3 className="font-display text-lg font-medium tracking-tight">{item.title}</h3>
                <p className="mt-1.5 text-sm leading-relaxed text-secondary">{item.text}</p>
              </div>
            ))}
          </div>
        </section>
      </Container>

      <Container>
        <section className="max-w-2xl space-y-6">
          <h2 className="font-display text-xl font-medium tracking-tight">{aboutConfig.principles.title}</h2>
          <div className="grid gap-4 sm:grid-cols-2">
            {aboutConfig.principles.items.map((item) => (
              <div
                key={item.title}
                className="rounded-xl border border-border bg-card/60 p-4 transition-all duration-300 hover:-translate-y-1 hover:border-foreground/15 hover:bg-card/80 hover:shadow-md"
              >
                <h3 className="font-display text-lg font-medium tracking-tight">{item.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-secondary">
                  {item.description}
                </p>
              </div>
            ))}
          </div>
        </section>
      </Container>

      <Container>
        <section className="max-w-2xl space-y-4">
          <h2 className="font-display text-xl font-medium tracking-tight">{aboutConfig.beyond.title}</h2>
          <div className="space-y-4 text-sm leading-relaxed text-secondary sm:text-base">
            {aboutConfig.beyond.paragraphs.map((paragraph) => (
              <p key={paragraph}>
                <HighlightedText text={paragraph} />
              </p>
            ))}
          </div>
        </section>
      </Container>

      <Container>
        <section className="max-w-2xl space-y-4 rounded-2xl border border-border bg-card/60 p-6">
          <h2 className="font-display text-xl font-medium tracking-tight">Let&apos;s connect</h2>
          <p className="text-sm leading-relaxed text-secondary sm:text-base">
            Whether you want to collaborate, talk security, or just say hi - I&apos;d love to
            hear from you.
          </p>
          <div className="flex flex-wrap gap-2 pt-1">
            {aboutConfig.connectLinks.map((link) => {
              const Icon = connectIconMap[link.icon];
              const external =
                link.href.startsWith("http") || link.href.startsWith("mailto:");

              return (
                <Link
                  key={link.name}
                  href={link.href}
                  target={external ? "_blank" : undefined}
                  rel={external ? "noopener noreferrer" : undefined}
                  aria-label={link.name}
                  className="flex size-10 items-center justify-center rounded-xl border border-border text-secondary transition-all duration-200 hover:-translate-y-0.5 hover:border-foreground/20 hover:bg-muted hover:text-foreground hover:shadow-sm"
                >
                  <Icon className="size-5" />
                </Link>
              );
            })}
          </div>
        </section>
      </Container>
    </div>
  );
}
