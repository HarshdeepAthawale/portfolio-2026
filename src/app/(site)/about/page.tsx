import { MinecraftAbout } from "@/components/minecraft/about";

export const metadata = { title: "About Me — Harshdeep Athawale" };

// GitHub stats load in the browser from /api/github, so this page stays a fast static page
// while the numbers are always fresh.
export default function Page() { return <MinecraftAbout />; }
