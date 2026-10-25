"use client";

import Link from "next/link";
import Image from "next/image";
import { useLayoutEffect, useRef, useState, type CSSProperties } from "react";
import { heroConfig, socialLinks } from "@/config/hero";
import { GameButton, SocialIcon } from "./ui";

export function MinecraftHome() {
  const splash = useRef<HTMLSpanElement>(null);
  const [splashScale, setSplashScale] = useState(1);
  useLayoutEffect(() => {
    const fit = () => {
      const label = splash.current;
      const logo = label?.parentElement;
      if (!label || !logo) return;
      setSplashScale(current => {
        const naturalWidth = label.scrollWidth / current;
        if (!naturalWidth) return current;
        const bounds = label.getBoundingClientRect();
        const center = (bounds.left + bounds.right) / 2;
        const rotationScale = bounds.width / label.scrollWidth || 1;
        const room = Math.min(center - 6, window.innerWidth - 6 - center);
        const limit = Math.max(60, Math.min(logo.getBoundingClientRect().width * 0.46, 2 * room / rotationScale));
        return Math.min(1, limit / naturalWidth);
      });
    };
    fit();
    void document.fonts?.ready.then(fit);
    window.addEventListener("resize", fit);
    return () => window.removeEventListener("resize", fit);
  }, []);
  return <main className="mc-home" id="main-content">
    <h1 className="sr-only">{heroConfig.name} — Portfolio</h1>
    <div className="mc-title-wrap">
      <div className="mc-logo" aria-hidden="true">
        <Image src="/minecraft/logo.svg" alt="" width={1600} height={352} priority unoptimized draggable={false} />
        <span className="mc-splash" ref={splash} style={{ "--splash-scale": splashScale } as CSSProperties}>CSE@TIET</span>
      </div>
    </div>
    <nav className="mc-main-menu" aria-label="Portfolio">
      <GameButton href="/experience">Experience</GameButton>
      <GameButton href="/projects">Projects</GameButton>
      <GameButton href="/about">About Me</GameButton>
      <div className="mc-menu-secondary">
        <Link href={socialLinks.find(link => link.icon === "github")!.href} target="_blank" rel="noopener noreferrer" className="mc-button mc-icon-button" aria-label="GitHub"><SocialIcon network="github" /></Link>
        <GameButton href="/blog">Blog</GameButton>
        <GameButton href="/skills">Skills</GameButton>
        <Link href={socialLinks.find(link => link.icon === "linkedin")!.href} target="_blank" rel="noopener noreferrer" className="mc-button mc-icon-button" aria-label="LinkedIn"><SocialIcon network="linkedin" /></Link>
      </div>
    </nav>
    <p className="mc-version">Portfolio V2.0</p>
    <footer className="mc-home-footer"><span>© {new Date().getFullYear()} {heroConfig.name}. Not an official Minecraft product.</span><span>Not approved by or associated with Mojang or Microsoft.</span></footer>
  </main>;
}
