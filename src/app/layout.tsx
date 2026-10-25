import type { Metadata } from "next";
import { IBM_Plex_Mono } from "next/font/google";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ViewTransitionsProvider } from "@/components/view-transitions";
import { siteConfig } from "@/config/meta";
import { paletteBootScript, paletteStylesheet } from "@/config/palettes";
import "./globals.css";

// One monospace voice for the whole site.
const plexMono = IBM_Plex_Mono({
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  variable: "--font-plex-mono",
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
    <html lang="en" className="dark" data-palette="blackmoney" suppressHydrationWarning>
      <head>
        {/* Every terminal palette as CSS variables; the boot script picks the saved one before paint. */}
        <style dangerouslySetInnerHTML={{ __html: paletteStylesheet() }} />
        <script dangerouslySetInnerHTML={{ __html: paletteBootScript() }} />
      </head>
      <body
        className={`${plexMono.variable} min-h-screen bg-background font-sans antialiased`}
        suppressHydrationWarning
      >
        <script
          dangerouslySetInnerHTML={{
            __html:
              "try{if(!matchMedia('(prefers-reduced-motion: reduce)').matches)document.documentElement.classList.add('reveal-enabled')}catch(e){}",
          }}
        />
        <TooltipProvider>
          <ViewTransitionsProvider>{children}</ViewTransitionsProvider>
        </TooltipProvider>
      </body>
    </html>
  );
}
