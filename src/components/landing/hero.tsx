"use client";

import Link from "next/link";
import { ArrowUpRight, Copy, Check, SealCheck } from "@phosphor-icons/react";
import { useState } from "react";
import { GithubLogo, LinkedinLogo, MediumLogo, XLogo } from "@phosphor-icons/react";
import { ProfileAvatar } from "@/components/profile-avatar";
import { Container } from "@/components/container";
import { RotatingTitle } from "@/components/landing/rotating-title";
import { SpotifyLastPlayed } from "@/components/landing/spotify-last-played";
import { TimezoneWidget } from "@/components/landing/timezone-widget";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { heroConfig, socialLinks } from "@/config/hero";

const iconMap = {
  x: XLogo,
  linkedin: LinkedinLogo,
  github: GithubLogo,
  medium: MediumLogo,
};

export function Hero() {
  const [copied, setCopied] = useState(false);

  const copyEmail = async () => {
    await navigator.clipboard.writeText(heroConfig.email);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <Container className="pt-4">
      <div className="animate-in-up-on-view corner-frame flex flex-col gap-5 p-5 sm:p-7">
        <div className="flex items-start gap-4">
          <ProfileAvatar />
          <div className="min-w-0 flex-1">
            <h1 className="font-display text-4xl font-medium leading-[1.05] sm:text-5xl">
              {heroConfig.name.split(" ").slice(0, -1).join(" ")}{" "}
              {/* Badge rides with the last name so it never strands on wrap. */}
              <span className="whitespace-nowrap">
                <span className="text-foreground/45">
                  {heroConfig.name.split(" ").slice(-1)}
                </span>
                {/* Sized in em and nudged so its centre sits on the middle of the
                    capitals (Petrona cap height ~0.64em), at every heading size. */}
                <SealCheck
                  className="ml-[0.2em] inline-block size-[0.62em] align-[0.01em] text-sun"
                  weight="fill"
                  aria-label="Verified"
                />
              </span>
            </h1>
            <RotatingTitle />
            <p className="mt-3 flex flex-wrap items-center gap-x-1 gap-y-1 text-sm sm:text-base">
              <button
                type="button"
                onClick={() => void copyEmail()}
                className="group inline-flex cursor-pointer items-center gap-1.5 text-secondary transition-colors hover:text-foreground"
                aria-label="Copy email"
              >
                <span className="hidden md:block">{heroConfig.email}</span>
                <span className="block md:hidden">Email</span>
                <span className="relative inline-flex size-4 shrink-0 items-center justify-center">
                  {copied ? (
                    <Check className="size-4 text-foreground" />
                  ) : (
                    <Copy className="size-4 transition-transform group-hover:scale-110" />
                  )}
                </span>
              </button>
            </p>
          </div>
        </div>

        <p className="max-w-xl text-sm leading-relaxed text-secondary sm:text-base">
          {heroConfig.bio}
        </p>

        {/* Availability + the two actions recruiters look for. */}
        <div className="flex flex-wrap items-center gap-x-4 gap-y-3">
          <div className="flex items-center gap-2">
            <Link
              href="/resume"
              className="inline-flex h-10 items-center gap-1.5 rounded-sm bg-foreground px-5 text-sm font-medium text-background transition-opacity hover:opacity-85"
            >
              Resume
              <ArrowUpRight className="size-3.5" />
            </Link>
            <a
              href={`mailto:${heroConfig.email}`}
              className="inline-flex h-10 items-center rounded-sm border border-foreground/25 px-5 text-sm font-medium transition-colors hover:bg-foreground hover:text-background"
            >
              Get in touch
            </a>
          </div>
          <p className="inline-flex items-center gap-2 text-xs text-secondary sm:text-sm">
            <span className="relative flex size-2" aria-hidden>
              <span className="absolute inline-flex size-full animate-ping rounded-full bg-sun opacity-60 motion-reduce:animate-none" />
              <span className="relative inline-flex size-2 rounded-full bg-sun" />
            </span>
            {heroConfig.availability}
          </p>
        </div>

        <div className="flex flex-wrap gap-0.5">
          {socialLinks.map((link) => {
            const Icon = iconMap[link.icon];
            const external = link.href.startsWith("http") || link.href.startsWith("mailto:");

            return (
              <Tooltip key={link.name} delayDuration={0}>
                <TooltipTrigger asChild>
                  <Link
                    href={link.href}
                    target={external ? "_blank" : undefined}
                    rel={external ? "noopener noreferrer" : undefined}
                    aria-label={link.name}
                    className="flex items-center gap-2 p-1 text-secondary transition-colors hover:text-foreground"
                  >
                    <Icon className="size-5" />
                  </Link>
                </TooltipTrigger>
                <TooltipContent>{link.name}</TooltipContent>
              </Tooltip>
            );
          })}
        </div>

        <div className="flex flex-wrap items-stretch justify-between gap-5 pt-1">
          <SpotifyLastPlayed />
          <TimezoneWidget />
        </div>
      </div>
    </Container>
  );
}
