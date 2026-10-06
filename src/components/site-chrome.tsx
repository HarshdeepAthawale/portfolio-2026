import { Analytics } from "@vercel/analytics/react";
import { CommandMenu } from "@/components/command-menu";
import { CursorPet } from "@/components/cursor-pet";
import { Lightbox } from "@/components/lightbox";
import { PageTracker } from "@/components/page-tracker";
import { ScrollReveal } from "@/components/scroll-reveal";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";

/** The public site's frame: header, footer and the site-wide extras. */
export function SiteChrome({ children }: { children: React.ReactNode }) {
  return (
    <>
      <div className="relative flex min-h-screen flex-col bg-background">
        <SiteHeader />
        <main className="page-content flex-1">{children}</main>
        <SiteFooter />
        <div className="pointer-events-none fixed inset-x-0 bottom-0 z-10 h-[60px] bg-gradient-to-t from-background/80 to-transparent [mask-image:linear-gradient(to_top,black_50%,transparent)]" />
        <CommandMenu />
        <CursorPet />
        <ScrollReveal />
        <Lightbox />
        <PageTracker />
      </div>
      <Analytics />
    </>
  );
}
