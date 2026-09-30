import type { Metadata } from "next";
import { MediaLibrary } from "@/app/admin/_components/media-library";
import { listRepoDir } from "@/lib/admin/repo";

export const metadata: Metadata = { title: "Media" };

export default async function MediaPage() {
  const files = await listRepoDir("public/assets/uploads");
  const images = files
    .filter((file) => /\.(webp|png|jpe?g)$/.test(file.name))
    .map((file) => `/assets/uploads/${file.name}`)
    .reverse();

  return (
    <div className="space-y-6">
      <div>
        <p className="font-mono text-xs uppercase tracking-[0.15em] text-secondary">Media</p>
        <h1 className="font-display mt-1 text-3xl font-medium tracking-tight">Images</h1>
        <p className="mt-2 max-w-xl text-sm text-secondary">
          Uploads are resized, converted to WebP and stripped of metadata (including GPS location).
          They go live with your next publish.
        </p>
      </div>
      <MediaLibrary initial={images} />
    </div>
  );
}
