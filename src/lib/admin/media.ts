import { randomBytes } from "node:crypto";
import sharp from "sharp";
import { slugify } from "@/lib/admin/posts";

// Vercel caps request bodies at 4.5 MB; the editor downsizes photos before upload.
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

/**
 * Re-encodes an uploaded image to WebP. Re-encoding destroys anything smuggled
 * inside the file and strips metadata (EXIF, including GPS location).
 */
export async function processImage(file: unknown, nameHint: string) {
  const input = await readUpload(file, "image");
  const kind = sniff(input);
  if (!kind || kind === "pdf") throw new Error("Only JPEG, PNG, WebP, GIF or AVIF images are allowed.");

  const { data, info } = await sharp(input, { limitInputPixels: 50_000_000 })
    .rotate() // apply EXIF orientation before it's stripped
    .resize({ width: 2400, height: 2400, fit: "inside", withoutEnlargement: true })
    .webp({ quality: 82 })
    .toBuffer({ resolveWithObject: true });

  const base = slugify(nameHint.replace(/\.[a-z0-9]+$/i, "")).slice(0, 40).replace(/-+$/, "") || "image";
  const name = `${base}-${randomBytes(4).toString("hex")}.webp`;
  return {
    repoPath: `public/assets/uploads/${name}`,
    publicPath: `/assets/uploads/${name}`,
    content: data,
    width: info.width,
    height: info.height,
  };
}

/** Checks a resume PDF and re-encodes its first-page preview image. */
export async function processResume(pdf: unknown, preview: unknown) {
  const pdfBytes = await readUpload(pdf, "PDF");
  if (sniff(pdfBytes) !== "pdf") throw new Error("That file isn't a PDF.");

  const previewBytes = await readUpload(preview, "preview image");
  if (sniff(previewBytes) !== "png") throw new Error("The preview must be a PNG.");
  const previewPng = await sharp(previewBytes, { limitInputPixels: 20_000_000 })
    .resize({ width: 1530, withoutEnlargement: true })
    .png({ compressionLevel: 9 })
    .toBuffer();

  return { pdfBytes, previewPng };
}
