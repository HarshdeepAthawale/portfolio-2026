import type { Metadata } from "next";
import { IBM_Plex_Mono, Instrument_Sans, Petrona } from "next/font/google";
import { ThemeProvider } from "@/components/theme-provider";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ViewTransitionsProvider } from "@/components/view-transitions";
import { siteConfig } from "@/config/meta";
import "./globals.css";

// A soft, low-contrast serif for headings, a humanist grotesk for body text,
// and a mono for small uppercase labels.
const petrona = Petrona({
  subsets: ["latin"],
  weight: ["300", "400"],
  variable: "--font-petrona",
});

const instrumentSans = Instrument_Sans({
  subsets: ["latin"],
  variable: "--font-instrument",
});

const plexMono = IBM_Plex_Mono({
  subsets: ["latin"],
  weight: ["400", "500"],
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
    <html lang="en" suppressHydrationWarning>
      <body
        className={`${petrona.variable} ${instrumentSans.variable} ${plexMono.variable} min-h-screen bg-background font-sans antialiased`}
        suppressHydrationWarning
      >
        <script
          dangerouslySetInnerHTML={{
            __html:
              "try{if(!matchMedia('(prefers-reduced-motion: reduce)').matches)document.documentElement.classList.add('reveal-enabled')}catch(e){}",
          }}
        />
        <ThemeProvider attribute="class" defaultTheme="dark" enableSystem disableTransitionOnChange>
          <TooltipProvider>
            <ViewTransitionsProvider>
            {children}
            </ViewTransitionsProvider>
          </TooltipProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
