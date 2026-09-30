"use client";

import { Check, Copy, UploadSimple } from "@phosphor-icons/react";
import { useRef, useState } from "react";
import { primaryButtonClass } from "@/app/admin/_components/styles";
import { adminImageSrc, uploadImage } from "@/app/admin/_components/upload";
import { cn } from "@/lib/utils";

export function MediaLibrary({ initial }: { initial: string[] }) {
  const [images, setImages] = useState(initial);
  const [uploading, setUploading] = useState(0);
  const [error, setError] = useState("");
  const [copied, setCopied] = useState("");
  const [dragging, setDragging] = useState(false);
  const input = useRef<HTMLInputElement>(null);

  async function upload(files: File[]) {
    setError("");
    for (const file of files.filter((f) => f.type.startsWith("image/"))) {
      setUploading((n) => n + 1);
      const result = await uploadImage(file);
      setUploading((n) => n - 1);
      if (result.ok) setImages((current) => [result.path, ...current]);
      else setError(result.error);
    }
  }

  async function copy(text: string) {
    await navigator.clipboard.writeText(text);
    setCopied(text);
    setTimeout(() => setCopied(""), 1500);
  }

  return (
    <div className="space-y-4">
      <div
        onDragOver={(event) => {
          event.preventDefault();
          setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={(event) => {
          event.preventDefault();
          setDragging(false);
          void upload([...event.dataTransfer.files]);
        }}
        className={cn(
          "flex flex-col items-center justify-center gap-3 rounded-2xl border border-dashed p-8 text-center transition-colors",
          dragging ? "border-sage bg-sage-soft" : "border-border",
        )}
      >
        <p className="text-sm text-secondary">Drop images here, or</p>
        <button type="button" onClick={() => input.current?.click()} disabled={uploading > 0} className={primaryButtonClass}>
          <UploadSimple className="size-4" />
          {uploading > 0 ? `Uploading ${uploading}…` : "Choose images"}
        </button>
        <input
          ref={input}
          type="file"
          multiple
          accept="image/jpeg,image/png,image/webp,image/gif,image/avif"
          className="hidden"
          onChange={(event) => {
            void upload([...(event.target.files ?? [])]);
            event.target.value = "";
          }}
        />
      </div>
      {error && <p className="text-sm text-red-600 dark:text-red-400">{error}</p>}

      {images.length === 0 ? (
        <p className="text-sm text-secondary">No uploads yet.</p>
      ) : (
        <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
          {images.map((src) => {
            const markdown = `![](${src})`;
            return (
              <li key={src} className="overflow-hidden rounded-xl border border-border bg-card/70">
                {/* eslint-disable-next-line @next/next/no-img-element -- admin thumbnail */}
                <img src={adminImageSrc(src)} alt="" loading="lazy" className="aspect-[4/3] w-full object-cover" />
                <div className="space-y-1.5 p-2.5">
                  <p className="truncate font-mono text-[11px] text-secondary" title={src}>
                    {src.split("/").pop()}
                  </p>
                  <div className="flex gap-3 text-xs">
                    {[
                      { label: "Path", text: src },
                      { label: "Markdown", text: markdown },
                    ].map((item) => (
                      <button
                        key={item.label}
                        type="button"
                        onClick={() => void copy(item.text)}
                        className="inline-flex items-center gap-1 text-sage hover:underline"
                      >
                        {copied === item.text ? <Check className="size-3" /> : <Copy className="size-3" />}
                        {item.label}
                      </button>
                    ))}
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
