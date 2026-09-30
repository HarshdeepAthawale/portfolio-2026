"use server";

import { run } from "@/app/admin/_actions/result";
import { processImage, processResume } from "@/lib/admin/media";
import { commitChanges } from "@/lib/admin/repo";
import { assertAdmin } from "@/lib/admin/session";

/**
 * Uploads land in public/assets/uploads/. Upload-only commits don't trigger a
 * deploy (see vercel.json); they go live with the next publish. Until then the
 * admin preview serves them straight from the repo.
 */
export async function uploadImageAction(formData: FormData) {
  return run(async () => {
    await assertAdmin();
    const file = formData.get("file");
    const name = file instanceof File ? file.name : "image";
    const image = await processImage(file, name);
    await commitChanges(
      [{ path: image.repoPath, content: image.content, expectedSha: null }],
      `media: add ${image.publicPath.split("/").pop()}`,
    );
    console.info(`[admin] uploaded ${image.publicPath}`);
    return { path: image.publicPath, width: image.width, height: image.height };
  });
}

export async function uploadResumeAction(formData: FormData) {
  return run(async () => {
    await assertAdmin();
    const { pdfBytes, previewPng } = await processResume(formData.get("pdf"), formData.get("preview"));
    const result = await commitChanges(
      [
        { path: "public/assets/resume.pdf", content: pdfBytes },
        { path: "public/assets/resume-preview.png", content: previewPng },
      ],
      "update: new resume and refreshed preview",
    );
    console.info("[admin] resume updated");
    return { commitUrl: result.url ?? null };
  });
}
