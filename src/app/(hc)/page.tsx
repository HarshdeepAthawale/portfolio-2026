import fs from "fs/promises";
import path from "path";
import type { Metadata } from "next";
import { IntroView } from "@/components/hc/intro-view";
import { socialLinks } from "@/config/hero";
import { siteConfig } from "@/config/meta";

// The wall is this site's own source, read once at build time.
export const dynamic = "force-static";

export const metadata: Metadata = {
  title: siteConfig.title,
  description: siteConfig.description,
  alternates: { canonical: "/" },
};

const WALL = [
  "src/lib/analytics.ts",
  "src/lib/github-repo.ts",
  "src/components/hc/worm.ts",
  "src/components/hc/watch.ts",
  "src/components/hc/ink.ts",
  "src/components/hc/terminal.ts",
  "src/config/palettes.ts",
  "src/components/hc/wheel.ts",
];

export default async function IntroPage() {
  const files = (
    await Promise.all(
      WALL.map(async (file) => {
        try {
          const text = await fs.readFile(path.join(process.cwd(), file), "utf8");
          return { path: file, lines: text.replace(/\t/g, "  ").split(/\r?\n/) };
        } catch {
          return null;
        }
      }),
    )
  ).filter((file): file is { path: string; lines: string[] } => Boolean(file));
  const github = socialLinks.find((link) => link.icon === "github");
  return <IntroView files={files} links={github ? [{ name: "github", href: github.href }] : []} note="// breaking things, carefully." />;
}
