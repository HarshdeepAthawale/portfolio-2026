"use client";

import { ArrowUpRight, CaretRight } from "@phosphor-icons/react";
import Image from "next/image";
import Link from "next/link";
import { Container } from "@/components/container";
import { SectionHeading } from "@/components/section-heading";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { experience, type ExperienceItem } from "@/config/experience";
import { cn } from "@/lib/utils";

function TimelineItem({ job, delay }: { job: ExperienceItem; delay: number }) {
  const hasDetails = Boolean(job.details?.length);

  return (
    <li
      className="animate-in-up-on-view relative flex gap-4 pb-10 last:pb-0 sm:gap-5"
      style={{ animationDelay: `${delay}s` }}
    >
      {/* Node on the timeline: the company logo, or a sage dot. */}
      <div className="relative z-10 flex size-10 shrink-0 items-center justify-center overflow-hidden rounded-full border border-border bg-background">
        {job.logo ? (
          <Image
            src={job.logo}
            alt={`${job.company} logo`}
            width={40}
            height={40}
            className="size-full object-cover"
            unoptimized
          />
        ) : (
          <span className="size-2.5 rounded-full bg-sage" />
        )}
      </div>

      <Collapsible className="group/card min-w-0 flex-1 pt-1">
        {/* Phones: date/location sit on one line under the role. Wider: right column. */}
        <div className="flex flex-col gap-1.5 sm:flex-row sm:items-start sm:justify-between sm:gap-4">
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <h3 className="font-display text-xl font-medium tracking-tight sm:text-2xl">
                {job.company}
              </h3>
              {job.working && (
                <span className="inline-flex items-center gap-1.5 rounded-full border border-sage-border bg-sage-soft px-2 py-0.5 text-xs text-sage">
                  <span className="size-1.5 animate-pulse rounded-full bg-sage" />
                  Current
                </span>
              )}
              {hasDetails && (
                <CollapsibleTrigger
                  className={cn(
                    "group/trigger inline-flex size-7 shrink-0 items-center justify-center rounded-md text-secondary transition-colors hover:bg-muted hover:text-foreground",
                    "opacity-100 focus-visible:opacity-100 data-[state=open]:opacity-100 sm:opacity-0 sm:group-hover/card:opacity-100",
                  )}
                  aria-label={`Show details for ${job.company}`}
                >
                  <CaretRight className="size-4 transition-transform duration-200 group-data-[state=open]/trigger:rotate-90" />
                </CollapsibleTrigger>
              )}
            </div>
            <p className="mt-0.5 text-base text-secondary">
              {job.role}
              {job.employmentType && (
                <span className="text-muted-foreground"> · {job.employmentType}</span>
              )}
            </p>
          </div>

          <div className="flex flex-wrap items-baseline gap-x-3 text-sm text-secondary sm:block sm:shrink-0 sm:text-right">
            <p className="font-mono text-xs uppercase tracking-[0.1em] text-foreground/80 md:hidden">
              {job.periodShort}
            </p>
            <p className="hidden font-mono text-xs uppercase tracking-[0.1em] text-foreground/80 md:block">
              {job.periodLong}
            </p>
            <p className="sm:mt-1 md:hidden">{job.locationShort}</p>
            <p className="mt-1 hidden md:block">{job.locationLong}</p>
          </div>
        </div>

        <CollapsibleContent className="mt-4 space-y-2 text-sm leading-relaxed text-secondary">
          {job.details?.map((detail) => (
            <p key={detail}>• {detail}</p>
          ))}
          {job.tech && (
            <div className="flex flex-wrap gap-2 pt-1">
              {job.tech.map((item) => (
                <span
                  key={item}
                  className="rounded-full border border-border bg-muted px-2.5 py-1 font-mono text-xs"
                >
                  {item}
                </span>
              ))}
            </div>
          )}
          {job.photos && job.photos.length > 0 && (
            <div className="zoomable-gallery grid grid-cols-3 gap-2 pt-2">
              {job.photos.map((photo) => (
                // eslint-disable-next-line @next/next/no-img-element -- small thumbnails; lightbox opens full size
                <img
                  key={photo.src}
                  src={photo.src}
                  alt={photo.alt}
                  loading="lazy"
                  className="aspect-[4/3] w-full rounded-lg border border-border object-cover"
                />
              ))}
            </div>
          )}
        </CollapsibleContent>
      </Collapsible>
    </li>
  );
}

export function ExperienceSection({
  limit,
  showAllLink = false,
  index,
}: {
  limit?: number;
  showAllLink?: boolean;
  index?: number;
}) {
  const items = limit ? experience.slice(0, limit) : experience;

  return (
    <Container>
      <SectionHeading title="Experience" uppercase index={index} />
      <ol className="relative mt-6">
        {/* The timeline rail, running through the centre of each node. */}
        <span
          aria-hidden
          className="absolute bottom-5 left-5 top-5 w-px -translate-x-1/2 bg-foreground/15"
        />
        {items.map((job, i) => (
          <TimelineItem key={job.company} job={job} delay={(i + 1) * 0.05} />
        ))}
      </ol>
      {showAllLink && experience.length > (limit ?? experience.length) && (
        <Link
          href="/work"
          className="mt-6 inline-flex items-center gap-1 font-mono text-xs uppercase tracking-[0.15em] text-secondary transition-colors hover:text-foreground"
        >
          Show all work
          <ArrowUpRight className="size-3.5" />
        </Link>
      )}
    </Container>
  );
}
