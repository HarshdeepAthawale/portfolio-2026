import type { Metadata } from "next";
import Link from "next/link";
import { DATA_SECTIONS } from "@/lib/admin/schemas";

export const metadata: Metadata = { title: "Content" };

export default function ContentPage() {
  return (
    <div className="space-y-6">
      <div>
        <p className="font-mono text-xs uppercase tracking-[0.15em] text-secondary">Content</p>
        <h1 className="font-display mt-1 text-3xl font-medium tracking-tight">Site content</h1>
        <p className="mt-2 max-w-xl text-sm text-secondary">
          Everything on the portfolio outside of posts. Each save is one commit, so any change can be
          rolled back from GitHub.
        </p>
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        {DATA_SECTIONS.map((section) => (
          <Link
            key={section.key}
            href={`/admin/content/${section.key}`}
            className="rounded-2xl border border-border bg-card/70 p-5 transition-colors hover:border-sun-border hover:bg-sun-soft/40"
          >
            <p className="font-display text-lg font-medium tracking-tight">{section.title}</p>
            <p className="mt-1 text-sm text-secondary">{section.description}</p>
            <p className="mt-3 font-mono text-[11px] text-secondary">{section.file}</p>
          </Link>
        ))}
      </div>
    </div>
  );
}
