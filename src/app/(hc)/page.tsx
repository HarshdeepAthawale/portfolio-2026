import type { Metadata } from "next";
import { EditorView } from "@/components/hc/editor-view";
import { socialLinks } from "@/config/hero";
import { siteConfig } from "@/config/meta";
import { buildEditorData } from "@/lib/editor/build";

export const revalidate = 3600;

export const metadata: Metadata = {
  title: siteConfig.title,
  description: siteConfig.description,
  alternates: { canonical: "/" },
};

export default async function HomePage() {
  const data = await buildEditorData();
  const github = socialLinks.find((link) => link.icon === "github");
  return <EditorView data={data} links={github ? [{ name: "github", href: github.href }] : []} />;
}
