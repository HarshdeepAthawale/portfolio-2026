import Link from "next/link";
import { ArrowUpRight } from "@phosphor-icons/react/dist/ssr";
import { Container } from "@/components/container";
import { heroConfig, socialLinks } from "@/config/hero";
import { siteConfig } from "@/config/meta";
import { footerNav } from "@/config/navigation";

const labelClass = "font-mono text-xs uppercase tracking-[0.18em] text-secondary";
const linkClass = "text-[15px] text-foreground/85 transition-colors hover:text-sun";

export function SiteFooter() {
  return (
    <footer className="border-t border-border">
      <Container className="py-14 sm:py-16">
        {/* Closing card: a warm "dune" - sand in light mode, dusk in dark mode. */}
        <div className="cta-dune overflow-hidden rounded-md px-6 py-10 text-foreground sm:px-10 sm:py-14">
          <h2 className="max-w-lg font-display text-4xl leading-[1.05] sm:text-5xl">
            Have a bug worth chasing?
          </h2>
          <p className="mt-4 max-w-md text-sm leading-relaxed text-foreground/80 sm:text-base">
            Open to security internships for Summer 2027, and always happy to talk research,
            disclosures, or a tricky chain.
          </p>
          <div className="mt-8 flex flex-wrap items-center gap-x-5 gap-y-3">
            <a
              href={`mailto:${heroConfig.email}`}
              className="inline-flex h-10 items-center rounded-sm bg-foreground px-5 text-sm font-medium text-background transition-opacity hover:opacity-85"
            >
              Get in touch
            </a>
            <a href={`mailto:${heroConfig.email}`} className="link-underline text-sm text-foreground/80">
              {heroConfig.email}
            </a>
          </div>
        </div>

        <div className="mt-14 grid grid-cols-2 gap-x-6 gap-y-10 sm:grid-cols-3">
          <nav aria-label="Site">
            <p className={labelClass}>Navigate</p>
            <ul className="mt-4 space-y-2.5">
              {footerNav.map((item) => (
                <li key={item.href}>
                  <Link href={item.href} className={linkClass}>
                    {item.label}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>
          <div>
            <p className={labelClass}>Connect</p>
            <ul className="mt-4 space-y-2.5">
              {socialLinks.map((link) => (
                <li key={link.name}>
                  <a
                    href={link.href}
                    target="_blank"
                    rel="noopener noreferrer"
                    className={`${linkClass} inline-flex items-center gap-1`}
                  >
                    {link.name}
                    <ArrowUpRight className="size-3.5 text-foreground/40" />
                  </a>
                </li>
              ))}
              <li>
                <a href={`mailto:${heroConfig.email}`} className={linkClass}>
                  Email
                </a>
              </li>
            </ul>
          </div>
          <div className="col-span-2 sm:col-span-1">
            <p className={labelClass}>Disclosure</p>
            <ul className="mt-4 space-y-2.5">
              <li>
                <a href="/.well-known/security.txt" className={linkClass}>
                  security.txt
                </a>
              </li>
              <li>
                <a href={`mailto:${heroConfig.email}?subject=Security%20report`} className={linkClass}>
                  Report a vulnerability
                </a>
              </li>
            </ul>
          </div>
        </div>

        <div className="mt-12 flex flex-wrap items-center justify-between gap-3 border-t border-border pt-6 font-mono text-xs text-secondary">
          <p>
            © {new Date().getFullYear()} {siteConfig.name}
          </p>
          <p>{heroConfig.location}</p>
        </div>
      </Container>
    </footer>
  );
}
