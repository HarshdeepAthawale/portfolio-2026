import type { Metadata } from "next";
import { Plus_Jakarta_Sans, Newsreader, Geist_Mono } from "next/font/google";
import { Analytics } from "@vercel/analytics/react";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { CommandMenu } from "@/components/command-menu";
import { CursorPet } from "@/components/cursor-pet";
import { ScrollReveal } from "@/components/scroll-reveal";
import { ThemeProvider } from "@/components/theme-provider";
import { TooltipProvider } from "@/components/ui/tooltip";
import { siteConfig } from "@/config/meta";
import "./globals.css";

const plusJakartaSans = Plus_Jakarta_Sans({
  subsets: ["latin"],
  variable: "--font-plus-jakarta",
});

const newsreader = Newsreader({
  subsets: ["latin"],
  variable: "--font-newsreader",
});

const geistMono = Geist_Mono({
  subsets: ["latin"],
  variable: "--font-geist-mono",
});

export const metadata: Metadata = {
  title: siteConfig.title,
  description: siteConfig.description,
  metadataBase: new URL(siteConfig.url),
  openGraph: {
    type: "website",
    url: siteConfig.url,
    siteName: siteConfig.name,
    title: siteConfig.title,
    description: siteConfig.description,
    locale: "en_US",
  },
  twitter: {
    card: "summary_large_image",
    title: siteConfig.title,
    description: siteConfig.description,
    creator: "@harshdeep0x01",
  },
  icons: {
    icon: "/assets/avatar-smile.png",
    apple: "/assets/avatar-smile.png",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={`${plusJakartaSans.variable} ${newsreader.variable} ${geistMono.variable} min-h-screen bg-background font-sans antialiased`}
        suppressHydrationWarning
      >
        <script
          dangerouslySetInnerHTML={{
            __html:
              "try{if(!matchMedia('(prefers-reduced-motion: reduce)').matches)document.documentElement.classList.add('reveal-enabled')}catch(e){}",
          }}
        />
        <ThemeProvider attribute="class" defaultTheme="light" enableSystem disableTransitionOnChange>
          <TooltipProvider>
            <div className="relative flex min-h-screen flex-col bg-green-grid">
              <SiteHeader />
              <main className="page-content flex-1">{children}</main>
              <SiteFooter />
              <div className="pointer-events-none fixed inset-x-0 bottom-0 z-10 h-[60px] bg-gradient-to-t from-background/80 to-transparent [mask-image:linear-gradient(to_top,black_50%,transparent)]" />
              <CommandMenu />
              <CursorPet />
              <ScrollReveal />
            </div>
            <Analytics />
          </TooltipProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
