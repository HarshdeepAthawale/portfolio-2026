import Link from "next/link";
import Image from "next/image";
import type { ReactNode } from "react";

export const minecraftAsset = (path: string) => `/minecraft/${path}`;

export function GameButton({ children, href, className = "", ...props }: {
  children: ReactNode;
  href?: string;
  className?: string;
} & React.ButtonHTMLAttributes<HTMLButtonElement>) {
  if (href) {
    const external = href.startsWith("http") || href.startsWith("mailto:");
    return <Link href={href} className={`mc-button ${className}`} target={external ? "_blank" : undefined} rel={external ? "noopener noreferrer" : undefined}>{children}</Link>;
  }
  return <button type="button" className={`mc-button ${className}`} {...props}>{children}</button>;
}

export function GameScreen({ title, children, actions, className = "", backHref = "/" }: {
  title?: string;
  children: ReactNode;
  actions?: ReactNode;
  className?: string;
  backHref?: string;
}) {
  return <main className={`mc-screen ${className}`} id="main-content" data-back-href={backHref}>
    {title && <h1 className="mc-screen-title">{title}</h1>}
    <div className="mc-screen-body">{children}</div>
    <nav className={`mc-screen-actions ${actions ? "mc-custom-actions" : ""}`} aria-label="Page actions">
      {actions ?? <GameButton href={backHref}>Back</GameButton>}
    </nav>
  </main>;
}

export function InventorySlot({ src, className = "" }: { src: string; className?: string }) {
  return <span className={`mc-inventory-slot ${className}`}><Image src={minecraftAsset(src)} alt="" width={64} height={64} unoptimized aria-hidden="true" draggable={false} /></span>;
}

export function GameTags({ items }: { items: string[] }) {
  return <div className="mc-tags">{items.map(item => <span key={item}>{item}</span>)}</div>;
}

export function SocialIcon({ network }: { network: "github" | "linkedin" }) {
  return <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
    <path d={network === "github"
      ? "M12 .5C5.65.5.5 5.66.5 12.02c0 5.09 3.29 9.4 7.86 10.93.58.11.79-.25.79-.56 0-.27-.01-1-.02-1.96-3.2.7-3.88-1.54-3.88-1.54-.52-1.34-1.28-1.69-1.28-1.69-1.05-.72.08-.71.08-.71 1.16.08 1.77 1.2 1.77 1.2 1.03 1.77 2.71 1.26 3.37.96.1-.75.4-1.26.73-1.55-2.55-.29-5.24-1.28-5.24-5.69 0-1.26.45-2.29 1.19-3.1-.12-.29-.51-1.46.11-3.05 0 0 .97-.31 3.18 1.18a11 11 0 0 1 5.79 0c2.2-1.49 3.17-1.18 3.17-1.18.63 1.59.23 2.76.11 3.05.74.81 1.18 1.84 1.18 3.1 0 4.42-2.69 5.39-5.26 5.68.41.36.78 1.06.78 2.13 0 1.54-.01 2.78-.01 3.16 0 .31.21.68.8.56C20.21 21.42 23.5 17.1 23.5 12.02 23.5 5.66 18.35.5 12 .5Z"
      : "M4.98 3.5C4.98 4.88 3.87 6 2.5 6S0 4.88 0 3.5 1.13 1 2.5 1s2.48 1.12 2.48 2.5ZM.2 8h4.6v14H.2V8Zm7.4 0h4.4v1.92h.06c.61-1.16 2.1-2.38 4.33-2.38 4.63 0 5.49 3.05 5.49 7.02V22h-4.6v-6.18c0-1.47-.03-3.37-2.05-3.37-2.06 0-2.37 1.61-2.37 3.27V22h-4.6V8Z"} />
  </svg>;
}
