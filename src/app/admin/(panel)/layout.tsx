import Link from "next/link";
import { logout } from "@/app/admin/_actions/auth";
import { AdminNav } from "@/app/admin/_components/admin-nav";
import { isLocalMode } from "@/lib/admin/repo";
import { requireAdmin } from "@/lib/admin/session";

export const dynamic = "force-dynamic";

export default async function PanelLayout({ children }: { children: React.ReactNode }) {
  await requireAdmin();

  return (
    <div className="min-h-screen">
      <header className="sticky top-0 z-30 border-b border-border bg-background/85 backdrop-blur">
        {/* Phones: brand + actions on one row, the nav scrolls on its own row below. */}
        <div className="mx-auto flex max-w-5xl flex-wrap items-center gap-x-4 px-4 md:h-14 md:flex-nowrap">
          <Link href="/admin" className="shrink-0 whitespace-nowrap py-3 font-display text-lg font-medium tracking-tight md:py-0">
            HA <span className="text-secondary">admin</span>
          </Link>
          <div className="order-last -mx-4 w-[calc(100%+2rem)] overflow-x-auto px-4 pb-2 [scrollbar-width:none] md:order-none md:mx-0 md:w-auto md:min-w-0 md:flex-1 md:p-0">
            <AdminNav />
          </div>
          <div className="ml-auto flex shrink-0 items-center gap-3">
            <Link
              href="/"
              target="_blank"
              className="hidden text-sm text-secondary transition-colors hover:text-foreground sm:inline"
            >
              View site ↗
            </Link>
            <form action={logout}>
              <button
                type="submit"
                className="text-sm text-secondary transition-colors hover:text-foreground"
              >
                Sign out
              </button>
            </form>
          </div>
        </div>
      </header>
      {isLocalMode() && (
        <p className="border-b border-sun-border bg-sun-soft px-4 py-2 text-center text-xs text-sun">
          Local mode: changes are written to this folder, not committed to GitHub.
        </p>
      )}
      <main className="mx-auto max-w-5xl px-4 pb-24 pt-8">{children}</main>
    </div>
  );
}
