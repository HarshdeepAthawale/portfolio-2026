import { MinecraftAbout } from "@/components/minecraft/about";
import { siteConfig } from "@/config/meta";
import { getContributions, getProfile } from "@/lib/github-repo";

export const metadata = { title: "About Me — Harshdeep Athawale" };
export const revalidate = 3600;

export default async function Page() {
  const [profile, contributions] = await Promise.all([getProfile(), getContributions()]);
  return <MinecraftAbout github={{ username: siteConfig.githubUsername, profile, contributions }} />;
}
