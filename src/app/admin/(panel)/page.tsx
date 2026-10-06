import type { Metadata } from "next";
import Link from "next/link";
import { logoutEverywhere } from "@/app/admin/_actions/auth";
import { AutoRefresh } from "@/app/admin/_components/auto-refresh";
import { cardClass, primaryButtonClass, secondaryButtonClass } from "@/app/admin/_components/styles";
import { isTotpEnabled } from "@/lib/admin/env";
import { listPosts } from "@/lib/admin/posts";
import { recentCommits, type RecentCommit } from "@/lib/admin/repo";
import { DATA_SECTIONS } from "@/lib/admin/schemas";
import { getVisitorCount } from "@/lib/visitor-store";
import { cn } from "@/lib/utils";

export const metadata: Metadata = { title: "Dashboard" };

const STATE_LABEL: Record<RecentCommit["state"], { label: string; className: string }> = {
  success: { label: "Live", className: "bg-sun-soft text-sun border-sun-border" },
  pending: { label: "Deploying", className: "bg-amber-500/10 text-amber-700 border-amber-500/30 dark:text-amber-400" },
  failure: { label: "Failed", className: "bg-red-500/10 text-red-600 border-red-500/30 dark:text-red-400" },
  error: { label: "Failed", className: "bg-red-500/10 text-red-600 border-red-500/30 dark:text-red-400" },
  unknown: { label: "-", className: "text-secondary border-border" },
};

function timeAgo(iso: string) {
  const minutes = Math.round((Date.now() - Date.parse(iso)) / 60000);
  if (minutes < 1) return "just now";
  if (minutes < 60) return `${minutes} min ago`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours} h ago`;
  return `${Math.round(hours / 24)} d ago`;
}

export default async function DashboardPage() {
  const [blog, projects, visitors, commits] = await Promise.all([
    listPosts("blog"),
    listPosts("projects"),
    getVisitorCount().catch(() => null),
    recentCommits().catch(() => []),
  ]);
  const drafts = [...blog, ...projects].filter((post) => post.hasDraft);

  const stats: { label: string; value: number | string; href?: string }[] = [
    { label: "Published posts", value: blog.filter((post) => post.published).length },
    { label: "Project write-ups", value: projects.filter((post) => post.published).length },
    { label: "Open drafts", value: drafts.length },
    { label: "All-time visitors →", value: visitors ?? "-", href: "/admin/analytics" },
  ];

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="font-mono text-xs uppercase tracking-[0.15em] text-secondary">Dashboard</p>
          <h1 className="font-display mt-1 text-3xl font-medium tracking-tight">Welcome back</h1>
          <p className="mt-1">
            <AutoRefresh seconds={30} />
          </p>
        </div>
        <Link href="/admin/posts/blog/new" className={primaryButtonClass}>
          New post
        </Link>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {stats.map((stat) => {
          const tile = (
            <>
              <p className="font-display text-3xl font-medium tracking-tight">{stat.value}</p>
              <p className="mt-1 text-xs text-secondary">{stat.label}</p>
            </>
          );
          return stat.href ? (
            <Link key={stat.label} href={stat.href} className={`${cardClass} transition-colors hover:border-sun-border`}>
              {tile}
            </Link>
          ) : (
            <div key={stat.label} className={cardClass}>
              {tile}
            </div>
          );
        })}
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <section className={cardClass}>
          <h2 className="font-display text-lg font-medium tracking-tight">Drafts</h2>
          {drafts.length === 0 ? (
            <p className="mt-2 text-sm text-secondary">No open drafts.</p>
          ) : (
            <ul className="mt-3 divide-y divide-border">
              {drafts.slice(0, 6).map((post) => (
                <li key={`${post.collection}/${post.slug}`}>
                  <Link
                    href={`/admin/posts/${post.collection}/${post.slug}`}
                    className="flex items-baseline justify-between gap-3 py-2.5 text-sm hover:text-sun"
                  >
                    <span className="truncate">{post.title}</span>
                    <span className="shrink-0 text-xs text-secondary">
                      {post.published ? "edits to live post" : "unpublished"}
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className={cardClass}>
          <h2 className="font-display text-lg font-medium tracking-tight">Recent changes</h2>
          {commits.length === 0 ? (
            <p className="mt-2 text-sm text-secondary">
              Commit history shows here once GitHub publishing is configured.
            </p>
          ) : (
            <ul className="mt-3 divide-y divide-border">
              {commits.map((commit) => {
                const state = STATE_LABEL[commit.state];
                return (
                  <li key={commit.sha} className="flex items-center gap-3 py-2.5 text-sm">
                    <span className={cn("shrink-0 rounded-sm border px-2 py-0.5 text-[11px]", state.className)}>
                      {state.label}
                    </span>
                    <a
                      href={commit.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="min-w-0 flex-1 truncate hover:text-sun"
                    >
                      {commit.message}
                    </a>
                    <span className="shrink-0 text-xs text-secondary">{timeAgo(commit.date)}</span>
                  </li>
                );
              })}
            </ul>
          )}
        </section>
      </div>

      <section className={cardClass}>
        <h2 className="font-display text-lg font-medium tracking-tight">Site content</h2>
        <div className="mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
          {DATA_SECTIONS.map((section) => (
            <Link
              key={section.key}
              href={`/admin/content/${section.key}`}
              className="rounded-xl border border-border p-3 transition-colors hover:border-sun-border hover:bg-sun-soft/40"
            >
              <p className="text-sm font-medium">{section.title}</p>
              <p className="mt-0.5 text-xs text-secondary">{section.description}</p>
            </Link>
          ))}
        </div>
      </section>

      <section className={cardClass}>
        <h2 className="font-display text-lg font-medium tracking-tight">Security</h2>
        <p className="mt-2 text-sm text-secondary">
          Sessions end after 30 minutes idle or 8 hours total. Two-factor codes are{" "}
          <strong className="font-medium text-foreground">{isTotpEnabled() ? "on" : "off"}</strong>.
        </p>
        <form action={logoutEverywhere} className="mt-4">
          <button type="submit" className={secondaryButtonClass}>
            Sign out on every device
          </button>
        </form>
      </section>
    </div>
  );
}
