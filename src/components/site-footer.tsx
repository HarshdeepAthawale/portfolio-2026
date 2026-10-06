import Link from "next/link";
import {
  ArrowUpRight,
  EnvelopeSimple,
  GithubLogo,
  LinkedinLogo,
  MediumLogo,
  XLogo,
} from "@phosphor-icons/react/dist/ssr";
import { Container } from "@/components/container";
import { heroConfig } from "@/config/hero";
import { siteConfig } from "@/config/meta";

const footerSocial = [
  { name: "LinkedIn", href: "https://www.linkedin.com/in/harshdeepathawale/", icon: LinkedinLogo },
  { name: "GitHub", href: "https://github.com/HarshdeepAthawale", icon: GithubLogo },
  { name: "X", href: "https://x.com/harshdeep0x01", icon: XLogo },
  { name: "Medium", href: "https://medium.com/@harshdeepathawale", icon: MediumLogo },
  { name: "Email", href: `mailto:${heroConfig.email}`, icon: EnvelopeSimple },
];

export function SiteFooter() {
  return (
    <footer className="border-t border-border/60">
      <Container className="py-14 sm:py-16">
        {/* Closing note */}
        <p className="font-display text-2xl font-medium tracking-tight sm:text-3xl">
          Have a bug worth chasing? <span className="text-foreground/45">Let&apos;s talk.</span>
        </p>
        <p className="mt-3 max-w-md text-sm leading-relaxed text-secondary sm:text-base">
          Open to security internships for Summer 2027, and always happy to talk
          research, disclosures, or a tricky chain.
        </p>
        <a
          href={`mailto:${heroConfig.email}`}
          className="link-underline mt-5 inline-flex items-center gap-1.5 text-base font-medium"
        >
          {heroConfig.email}
          <ArrowUpRight className="size-4" />
        </a>

        <div className="mt-12 flex flex-col gap-5 border-t border-border/60 pt-6 sm:flex-row sm:items-center sm:justify-between">
          <p className="font-mono text-xs text-secondary">
            © {new Date().getFullYear()} {siteConfig.name}
          </p>
          <div className="flex items-center gap-2">
            {footerSocial.map((link) => {
              const Icon = link.icon;
              return (
                <Link
                  key={link.name}
                  href={link.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label={link.name}
                  className="flex size-9 items-center justify-center rounded-lg border border-border text-secondary transition-colors hover:bg-muted hover:text-foreground"
                >
                  <Icon className="size-5" />
                </Link>
              );
            })}
          </div>
        </div>
      </Container>
    </footer>
  );
}
