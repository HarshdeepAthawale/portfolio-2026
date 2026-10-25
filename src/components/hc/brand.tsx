import Link from "next/link";
import { MARK } from "./util";

/** The HA monogram plus the domain, top left on both terminal pages. */
export function Brand({ href = "/", tip }: { href?: string; tip?: string }) {
  return (
    <Link className="hc-brand" href={href} data-tip={tip} prefetch={false}>
      <svg viewBox="0 0 88 80" aria-hidden="true">
        {MARK.map((d) => (
          <path key={d} d={d} fillRule="evenodd" />
        ))}
      </svg>
      <span>harshdeepathawale.in</span>
    </Link>
  );
}

export function Elsewhere({ links }: { links: { name: string; href: string }[] }) {
  return (
    <nav className="hc-elsewhere" aria-label="Elsewhere">
      {links.map((link) => (
        <a key={link.name} href={link.href} rel="me noopener" target="_blank">
          {link.name}
        </a>
      ))}
    </nav>
  );
}
