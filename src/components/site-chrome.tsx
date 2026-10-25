import { Analytics } from "@vercel/analytics/react";
import { Lightbox } from "@/components/lightbox";
import { PageTracker } from "@/components/page-tracker";
import { ScrollReveal } from "@/components/scroll-reveal";
import { MinecraftWorld } from "@/components/minecraft/world";

export function SiteChrome({ children }: { children: React.ReactNode }) {
  return <><MinecraftWorld>{children}<Lightbox /><PageTracker /><ScrollReveal /></MinecraftWorld><Analytics /></>;
}
