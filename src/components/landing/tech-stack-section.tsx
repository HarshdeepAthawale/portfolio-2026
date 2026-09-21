"use client";

import Image from "next/image";
import { Container } from "@/components/container";
import { SectionHeading } from "@/components/section-heading";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { techStack } from "@/config/tech-stack";

export function TechStackSection() {
  return (
    <Container>
      <SectionHeading title="Tech Stack" uppercase />
      <div className="flex flex-wrap gap-3">
        {techStack.map((tech) => (
          <Tooltip key={tech.name} delayDuration={0}>
            <TooltipTrigger asChild>
              <button
                type="button"
                aria-label={tech.name}
                className="flex size-[52px] items-center justify-center rounded-xl border border-dashed border-border bg-card/60 transition-all duration-200 hover:-translate-y-1 hover:scale-[1.06] hover:border-foreground/25 hover:bg-card hover:shadow-md active:translate-y-0 active:scale-100 dark:border-border dark:bg-white/95 dark:hover:bg-white"
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
                  className="size-[26px] shrink-0"
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
