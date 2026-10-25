import { Analytics } from "@vercel/analytics/react";
import { PageTracker } from "@/components/page-tracker";
import "./hc.css";

/** The terminal pages (/ and /site): full-bleed, no site header or footer. */
export default function TerminalLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      {children}
      <PageTracker />
      <Analytics />
    </>
  );
}
