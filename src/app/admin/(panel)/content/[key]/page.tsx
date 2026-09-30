import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { DataForm } from "@/app/admin/_components/data-form";
import { readRepoFile } from "@/lib/admin/repo";
import { getDataSection } from "@/lib/admin/schemas";

export const metadata: Metadata = { title: "Edit content" };

export default async function EditContentPage({ params }: { params: Promise<{ key: string }> }) {
  const { key } = await params;
  const section = getDataSection(key);
  if (!section) notFound();

  const file = await readRepoFile(section.file);
  if (!file) notFound();
  const initial: unknown = JSON.parse(file.content.toString("utf8"));

  return (
    <div className="space-y-6">
      <div>
        <Link href="/admin/content" className="text-sm text-secondary hover:text-foreground">
          ← Content
        </Link>
        <div className="mt-3 flex flex-wrap items-end justify-between gap-3">
          <div>
            <h1 className="font-display text-3xl font-medium tracking-tight">{section.title}</h1>
            <p className="mt-1 text-sm text-secondary">{section.description}</p>
          </div>
          <a href={section.viewPath} target="_blank" className="text-sm text-secondary hover:text-foreground">
            View on site ↗
          </a>
        </div>
      </div>
      <DataForm sectionKey={section.key} initial={initial} sha={file.sha} />
    </div>
  );
}
