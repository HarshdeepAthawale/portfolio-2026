import { randomBytes } from "node:crypto";
import { slugify } from "@/lib/admin/posts";

// Request bodies are capped at 4.5 MB; the editor downsizes photos before upload.
export const MAX_UPLOAD_BYTES = 4 * 1024 * 1024;

type Kind = "jpeg" | "png" | "webp" | "gif" | "avif" | "pdf";

/** Identifies a file by its signature bytes. The client's Content-Type is never trusted. */
export function sniff(buf: Buffer): Kind | null {
  const hex = buf.subarray(0, 12).toString("hex");
  if (hex.startsWith("ffd8ff")) return "jpeg";
  if (hex.startsWith("89504e470d0a1a0a")) return "png";
  if (hex.startsWith("47494638")) return "gif";
  if (buf.subarray(0, 4).toString("latin1") === "RIFF" && buf.subarray(8, 12).toString("latin1") === "WEBP") {
    return "webp";
  }
  if (buf.subarray(4, 12).toString("latin1").startsWith("ftypavi")) return "avif";
  if (buf.subarray(0, 5).toString("latin1") === "%PDF-") return "pdf";
  return null;
}

async function readUpload(file: unknown, label: string) {
  if (!(file instanceof File)) throw new Error(`No ${label} received.`);
  if (file.size === 0) throw new Error(`The ${label} is empty.`);
  if (file.size > MAX_UPLOAD_BYTES) throw new Error(`The ${label} is over 4 MB.`);
  return Buffer.from(await file.arrayBuffer());
}

type Encoded = { data: Buffer; width: number; height: number };

/** Cloudflare Images binding, available when the site runs on Cloudflare Workers. */
type ImagesBinding = {
  input(stream: ReadableStream): {
    transform(options: Record<string, unknown>): { output(options: Record<string, unknown>): Promise<{ response(): Response }> };
  };
  info(stream: ReadableStream): Promise<{ width?: number; height?: number }>;
};

async function loadSharp() {
  // sharp is a native Node module; Workers can't load it, so use the Images binding there.
  if (typeof navigator !== "undefined" && navigator.userAgent === "Cloudflare-Workers") return null;
  try {
    return (await import("sharp")).default;
  } catch {
    return null; // Not available on Cloudflare Workers.
  }
}

async function imagesBinding(): Promise<ImagesBinding> {
  const { getCloudflareContext } = await import("@opennextjs/cloudflare");
  const images = (getCloudflareContext().env as { IMAGES?: ImagesBinding }).IMAGES;
  if (!images) throw new Error("Image processing isn't available on this server.");
  return images;
}

/** Resizes and re-encodes with sharp on Node, or the Cloudflare Images binding on Workers. */
async function encode(input: Buffer, width: number, height: number | undefined, format: "webp" | "png"): Promise<Encoded> {
  const sharp = await loadSharp();
  if (sharp) {
    const pipeline = sharp(input, { limitInputPixels: 50_000_000 })
      .rotate() // apply EXIF orientation before it's stripped
      .resize({ width, height, fit: "inside", withoutEnlargement: true });
    const { data, info } = await (format === "webp" ? pipeline.webp({ quality: 82 }) : pipeline.png({ compressionLevel: 9 })).toBuffer({ resolveWithObject: true });
    return { data, width: info.width, height: info.height };
  }
  const images = await imagesBinding();
  const result = await images
    .input(new Blob([new Uint8Array(input)]).stream())
    .transform({ width, ...(height ? { height } : {}), fit: "scale-down", metadata: "none" })
    .output({ format: `image/${format}`, ...(format === "webp" ? { quality: 82 } : {}) });
  const data = Buffer.from(await result.response().arrayBuffer());
  const info = await images.info(new Blob([new Uint8Array(data)]).stream());
  return { data, width: info.width ?? 0, height: info.height ?? 0 };
}

/**
 * Re-encodes an uploaded image to WebP. Re-encoding destroys anything smuggled
 * inside the file and strips metadata (EXIF, including GPS location).
 */
export async function processImage(file: unknown, nameHint: string) {
  const input = await readUpload(file, "image");
  const kind = sniff(input);
  if (!kind || kind === "pdf") throw new Error("Only JPEG, PNG, WebP, GIF or AVIF images are allowed.");

  const { data, width, height } = await encode(input, 2400, 2400, "webp");

  const base = slugify(nameHint.replace(/\.[a-z0-9]+$/i, "")).slice(0, 40).replace(/-+$/, "") || "image";
  const name = `${base}-${randomBytes(4).toString("hex")}.webp`;
  return {
    repoPath: `public/assets/uploads/${name}`,
    publicPath: `/assets/uploads/${name}`,
    content: data,
    width,
    height,
  };
}

/** Checks a resume PDF and re-encodes its first-page preview image. */
export async function processResume(pdf: unknown, preview: unknown) {
  const pdfBytes = await readUpload(pdf, "PDF");
  if (sniff(pdfBytes) !== "pdf") throw new Error("That file isn't a PDF.");

  const previewBytes = await readUpload(preview, "preview image");
  if (sniff(previewBytes) !== "png") throw new Error("The preview must be a PNG.");
  const { data: previewPng } = await encode(previewBytes, 1530, undefined, "png");

  return { pdfBytes, previewPng };
}
