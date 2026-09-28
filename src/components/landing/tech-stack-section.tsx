"use client";

import Image from "next/image";
import { Container } from "@/components/container";
import { SectionHeading } from "@/components/section-heading";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { techStack } from "@/config/tech-stack";

export function TechStackSection({ index }: { index?: number }) {
  return (
    <Container>
      <SectionHeading title="Tech Stack" uppercase index={index} />
      <div className="flex flex-wrap gap-3">
        {techStack.map((tech) => (
          <Tooltip key={tech.name} delayDuration={0}>
            <TooltipTrigger asChild>
              <button
                type="button"
                aria-label={tech.name}
                className="group flex size-[52px] items-center justify-center rounded-xl border border-dashed border-border bg-card/60 transition-colors duration-300 hover:border-foreground/25 hover:bg-card focus-visible:bg-card dark:hover:bg-white dark:focus-visible:bg-white"
              >
                <Image
                  src={
                    tech.icon.startsWith("http") || tech.icon.startsWith("/")
                      ? tech.icon
                      : `https://cdn.simpleicons.org/${tech.icon}`
                  }
                  alt={tech.name}
                  width={26}
                  height={26}
                  // Monochrome silhouette at rest; real colors on hover/focus.
                  className="size-[26px] shrink-0 opacity-50 brightness-0 transition duration-300 group-hover:opacity-100 group-hover:brightness-100 group-focus-visible:opacity-100 group-focus-visible:brightness-100 dark:invert dark:group-hover:invert-0 dark:group-focus-visible:invert-0"
                  unoptimized
                />
              </button>
            </TooltipTrigger>
            <TooltipContent>{tech.name}</TooltipContent>
          </Tooltip>
        ))}
      </div>
    </Container>
  );
}
