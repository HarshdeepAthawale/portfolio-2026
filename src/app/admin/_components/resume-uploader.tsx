"use client";

import { FilePdf } from "@phosphor-icons/react";
import { useEffect, useRef, useState } from "react";
import { uploadResumeAction } from "@/app/admin/_actions/media";
import { cardClass, primaryButtonClass, secondaryButtonClass } from "@/app/admin/_components/styles";

// Same width as the existing preview image.
const PREVIEW_WIDTH = 1530;

/** Renders page 1 of a PDF to a PNG, in the browser, with pdf.js. */
async function renderFirstPage(file: File): Promise<Blob> {
  const pdfjs = await import("pdfjs-dist");
  pdfjs.GlobalWorkerOptions.workerSrc = new URL("pdfjs-dist/build/pdf.worker.min.mjs", import.meta.url).toString();
  const doc = await pdfjs.getDocument({ data: new Uint8Array(await file.arrayBuffer()) }).promise;
  const page = await doc.getPage(1);
  const base = page.getViewport({ scale: 1 });
  const viewport = page.getViewport({ scale: PREVIEW_WIDTH / base.width });
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(viewport.width);
  canvas.height = Math.round(viewport.height);
  const context = canvas.getContext("2d")!;
  context.fillStyle = "#ffffff";
  context.fillRect(0, 0, canvas.width, canvas.height);
  // "print" renders in one pass; the default paces itself with requestAnimationFrame,
  // which stalls if the tab is in the background.
  await page.render({ canvas, canvasContext: context, viewport, intent: "print" }).promise;
  await doc.destroy();
  const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/png"));
  if (!blob) throw new Error("Couldn't render the preview.");
  return blob;
}

export function ResumeUploader() {
  const input = useRef<HTMLInputElement>(null);
  const [pdf, setPdf] = useState<File | null>(null);
  const [preview, setPreview] = useState<Blob | null>(null);
  const [previewUrl, setPreviewUrl] = useState("");
  const [state, setState] = useState<"idle" | "rendering" | "ready" | "publishing" | "done">("idle");
  const [error, setError] = useState("");
  const [commitUrl, setCommitUrl] = useState<string | null>(null);

  useEffect(() => () => URL.revokeObjectURL(previewUrl), [previewUrl]);

  async function choose(file: File | undefined) {
    if (!file) return;
    setError("");
    setCommitUrl(null);
    if (file.type !== "application/pdf" && !file.name.toLowerCase().endsWith(".pdf")) {
      setError("Choose a PDF file.");
      return;
    }
    if (file.size > 4 * 1024 * 1024) {
      setError("The PDF is over 4 MB.");
      return;
    }
    setState("rendering");
    try {
      const png = await renderFirstPage(file);
      setPdf(file);
      setPreview(png);
      setPreviewUrl(URL.createObjectURL(png));
      setState("ready");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't read that PDF.");
      setState("idle");
    }
  }

  async function publish() {
    if (!pdf || !preview) return;
    setState("publishing");
    const formData = new FormData();
    formData.append("pdf", pdf);
    formData.append("preview", new File([preview], "resume-preview.png", { type: "image/png" }));
    const result = await uploadResumeAction(formData);
    if (result.ok) {
      setCommitUrl(result.commitUrl);
      setState("done");
    } else {
      setError(result.error);
      setState("ready");
    }
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_1.2fr]">
      <div className={`${cardClass} space-y-4`}>
        <div className="flex items-center gap-3">
          <FilePdf className="size-8 text-sun" />
          <div className="min-w-0">
            <p className="truncate text-sm font-medium">{pdf ? pdf.name : "No file chosen"}</p>
            <p className="text-xs text-secondary">
              {pdf ? `${(pdf.size / 1024).toFixed(0)} KB` : "PDF, up to 4 MB"}
            </p>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <button type="button" onClick={() => input.current?.click()} className={secondaryButtonClass} disabled={state === "publishing"}>
            {state === "rendering" ? "Reading…" : pdf ? "Choose another" : "Choose PDF"}
          </button>
          <button
            type="button"
            onClick={() => void publish()}
            disabled={state !== "ready"}
            className={primaryButtonClass}
          >
            {state === "publishing" ? "Publishing…" : "Publish resume"}
          </button>
        </div>
        <input
          ref={input}
          type="file"
          accept="application/pdf,.pdf"
          className="hidden"
          onChange={(event) => {
            void choose(event.target.files?.[0]);
            event.target.value = "";
          }}
        />
        {error && <p className="text-sm text-red-600 dark:text-red-400">{error}</p>}
        {state === "done" && (
          <p className="rounded-xl border border-sun-border bg-sun-soft px-3 py-2 text-sm text-sun">
            Published. /resume updates after the redeploy (about a minute).{" "}
            {commitUrl && (
              <a href={commitUrl} target="_blank" rel="noopener noreferrer" className="underline">
                View commit ↗
              </a>
            )}
          </p>
        )}
      </div>

      <div>
        <p className="mb-2 text-xs text-secondary">{previewUrl ? "New preview" : "Current preview"}</p>
        {/* eslint-disable-next-line @next/next/no-img-element -- local preview */}
        <img
          src={previewUrl || "/assets/resume-preview.png"}
          alt="Resume first page"
          className="w-full rounded-xl border border-border bg-white shadow-sm"
        />
      </div>
    </div>
  );
}
