import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { LoginForm } from "@/app/admin/login/login-form";
import { isAdminConfigured, isTotpEnabled } from "@/lib/admin/env";
import { getSession } from "@/lib/admin/session";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Sign in" };

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>;
}) {
  if (await getSession()) redirect("/admin");
  const { next } = await searchParams;

  return (
    <main className="flex min-h-screen items-center justify-center bg-green-grid px-4 py-16">
      <div className="w-full max-w-sm rounded-2xl border border-border bg-card/90 p-6 shadow-sm backdrop-blur sm:p-8">
        <p className="font-mono text-xs uppercase tracking-[0.15em] text-secondary">Admin</p>
        <h1 className="font-display mt-2 text-2xl font-medium tracking-tight">Sign in</h1>
        {isAdminConfigured() ? (
          <LoginForm totp={isTotpEnabled()} next={typeof next === "string" ? next : ""} />
        ) : (
          <p className="mt-4 text-sm leading-relaxed text-secondary">
            Sign-in isn&apos;t set up yet. Run{" "}
            <code className="rounded bg-muted px-1 py-0.5 font-mono text-xs">node scripts/admin-setup.mjs</code>{" "}
            and add the variables it prints to the environment.
          </p>
        )}
      </div>
    </main>
  );
}
