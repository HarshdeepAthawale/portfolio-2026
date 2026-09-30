"use client";

import { uploadImageAction } from "@/app/admin/_actions/media";

const MAX_BYTES = 3.5 * 1024 * 1024;
const MAX_SIDE = 2400;

/**
 * Phone photos are often over Vercel's 4.5 MB request cap, so big images are
 * scaled down in the browser first. The server re-encodes everything anyway.
 */
async function prepareImage(file: File): Promise<File> {
  if (!file.type.startsWith("image/") || file.type === "image/gif") return file;
  try {
    const bitmap = await createImageBitmap(file, { imageOrientation: "from-image" });
    const scale = Math.min(1, MAX_SIDE / Math.max(bitmap.width, bitmap.height));
    if (scale === 1 && file.size <= MAX_BYTES) {
      bitmap.close();
      return file;
    }
    const canvas = document.createElement("canvas");
    canvas.width = Math.round(bitmap.width * scale);
    canvas.height = Math.round(bitmap.height * scale);
    canvas.getContext("2d")!.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
    bitmap.close();
    const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/jpeg", 0.9));
    if (!blob) return file;
    return new File([blob], file.name.replace(/\.[a-z0-9]+$/i, "") + ".jpg", { type: "image/jpeg" });
  } catch {
    return file;
  }
}

export async function uploadImage(file: File) {
  const prepared = await prepareImage(file);
  const formData = new FormData();
  formData.append("file", prepared);
  return uploadImageAction(formData);
}

/** Uploads may not be deployed yet; the admin serves them from the repo. */
export function adminImageSrc(src: string) {
  return src.startsWith("/assets/uploads/") ? `/api/admin/media/${src.slice("/assets/".length)}` : src;
}
