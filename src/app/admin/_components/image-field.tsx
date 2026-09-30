"use client";

import { ImageSquare, UploadSimple, X } from "@phosphor-icons/react";
import { useRef, useState } from "react";
import { inputClass } from "@/app/admin/_components/styles";
import { adminImageSrc, uploadImage } from "@/app/admin/_components/upload";

/** A site image path with a thumbnail, an upload button and a clear button. */
export function ImageField({
  value,
  onChange,
  id,
}: {
  value: string;
  onChange: (value: string) => void;
  id?: string;
}) {
  const fileInput = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function onFile(file: File | undefined) {
    if (!file) return;
    setBusy(true);
    setError("");
    const result = await uploadImage(file);
    setBusy(false);
    if (result.ok) onChange(result.path);
    else setError(result.error);
    if (fileInput.current) fileInput.current.value = "";
  }

  return (
    <div className="mt-1.5">
      <div className="flex items-center gap-3">
        <div className="flex size-14 shrink-0 items-center justify-center overflow-hidden rounded-lg border border-border bg-muted">
          {value ? (
            // eslint-disable-next-line @next/next/no-img-element -- admin thumbnail
            <img src={adminImageSrc(value)} alt="" className="size-full object-cover" />
          ) : (
            <ImageSquare className="size-5 text-secondary" />
          )}
        </div>
        <div className="min-w-0 flex-1">
          <input
            id={id}
            value={value}
            onChange={(event) => onChange(event.target.value)}
            placeholder="/assets/uploads/photo.webp"
            className={`${inputClass} mt-0 font-mono text-xs`}
          />
          <div className="mt-1.5 flex gap-3 text-xs">
            <button
              type="button"
              onClick={() => fileInput.current?.click()}
              disabled={busy}
              className="inline-flex items-center gap-1 text-sage hover:underline disabled:opacity-50"
            >
              <UploadSimple className="size-3.5" />
              {busy ? "Uploading…" : "Upload"}
            </button>
            {value && (
              <button
                type="button"
                onClick={() => onChange("")}
                className="inline-flex items-center gap-1 text-secondary hover:text-foreground"
              >
                <X className="size-3.5" />
                Clear
              </button>
            )}
          </div>
        </div>
      </div>
      {error && <p className="mt-1.5 text-xs text-red-600 dark:text-red-400">{error}</p>}
      <input
        ref={fileInput}
        type="file"
        accept="image/jpeg,image/png,image/webp,image/gif,image/avif"
        className="hidden"
        onChange={(event) => void onFile(event.target.files?.[0])}
      />
    </div>
  );
}
