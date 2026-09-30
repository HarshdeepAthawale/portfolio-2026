import { readRepoFile } from "@/lib/admin/repo";
import { getSession } from "@/lib/admin/session";

// Serves site images straight from the repo for the admin preview, so uploads
// that haven't been deployed yet still show. Admin-only.
const TYPES: Record<string, string> = {
  webp: "image/webp",
  png: "image/png",
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  gif: "image/gif",
  avif: "image/avif",
};

export async function GET(_request: Request, { params }: { params: Promise<{ path: string[] }> }) {
  if (!(await getSession())) return new Response(null, { status: 401 });

  const { path } = await params;
  const relative = path.join("/");
  const ext = relative.split(".").pop()?.toLowerCase() ?? "";
  if (!TYPES[ext] || !/^[A-Za-z0-9_./-]+$/.test(relative) || relative.includes("..")) {
    return new Response(null, { status: 404 });
  }

  const file = await readRepoFile(`public/assets/${relative}`).catch(() => null);
  if (!file) return new Response(null, { status: 404 });

  return new Response(new Uint8Array(file.content), {
    headers: {
      "Content-Type": TYPES[ext],
      "Cache-Control": "private, max-age=300",
      "X-Content-Type-Options": "nosniff",
      "Content-Security-Policy": "default-src 'none'; sandbox",
    },
  });
}
