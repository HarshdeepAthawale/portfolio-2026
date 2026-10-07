import path from "path";
import sharp from "sharp";

const cache = new Map<string, { width: number; height: number } | null>();

/**
 * Real pixel size of an image in /public, read at build/render time so pages can
 * reserve its exact space (no layout jump when a lazy image arrives).
 */
export async function getImageSize(publicPath: string | undefined) {
  if (!publicPath || !publicPath.startsWith("/assets/")) return undefined;
  if (!cache.has(publicPath)) {
    try {
      const meta = await sharp(path.join(process.cwd(), "public", publicPath)).metadata();
      cache.set(publicPath, meta.width && meta.height ? { width: meta.width, height: meta.height } : null);
    } catch {
      cache.set(publicPath, null);
    }
  }
  return cache.get(publicPath) ?? undefined;
}

/** Adds `imageSize` to items that have an `image`. */
export async function withImageSizes<T extends { image?: string }>(items: T[]) {
  return Promise.all(items.map(async (item) => ({ ...item, imageSize: await getImageSize(item.image) })));
}
