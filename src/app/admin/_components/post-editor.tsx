"use client";

import {
  ArrowSquareOut,
  Code,
  ImageSquare,
  LinkSimple,
  ListBullets,
  Quotes,
  TextB,
  TextHTwo,
  TextItalic,
} from "@phosphor-icons/react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  discardDraftAction,
  publishAction,
  saveDraftAction,
  unpublishAction,
  type EditorPayload,
} from "@/app/admin/_actions/posts";
import { ImageField } from "@/app/admin/_components/image-field";
import {
  dangerButtonClass,
  helpClass,
  inputClass,
  labelClass,
  primaryButtonClass,
  secondaryButtonClass,
} from "@/app/admin/_components/styles";
import { uploadImage } from "@/app/admin/_components/upload";
import { COLLECTIONS, isValidSlug, slugify, type Collection } from "@/lib/admin/post-meta";
import type { Frontmatter } from "@/lib/admin/posts";
import { readingMinutes } from "@/lib/headings";
import { cn } from "@/lib/utils";

type Initial = {
  slug: string;
  frontmatter: Frontmatter;
  body: string;
  baseSha: string | null;
  isNew: boolean;
  hasDraft: boolean;
  updatedAt: number | null;
  publishedSha?: string | null;
};

type SaveState = "idle" | "unsaved" | "saving" | "saved" | "error";

const AUTOSAVE_MS = 1500;

function timeLabel(ms: number) {
  return new Date(ms).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

export function PostEditor({ collection, initial }: { collection: Collection; initial: Initial }) {
  const router = useRouter();
  const config = COLLECTIONS[collection];

  const [frontmatter, setFrontmatter] = useState<Frontmatter>(initial.frontmatter);
  const [body, setBody] = useState(initial.body);
  const [slug, setSlug] = useState(initial.slug);
  // New posts follow the title until the slug is edited by hand.
  const [slugTouched, setSlugTouched] = useState(Boolean(initial.slug));
  const [isNew, setIsNew] = useState(initial.isNew);
  const [baseSha, setBaseSha] = useState(initial.baseSha);
  const [publishedSha, setPublishedSha] = useState(initial.publishedSha ?? null);
  const [hasDraft, setHasDraft] = useState(initial.hasDraft);

  const [saveState, setSaveState] = useState<SaveState>(initial.hasDraft ? "saved" : "idle");
  const [savedAt, setSavedAt] = useState(initial.updatedAt);
  const [message, setMessage] = useState<{ kind: "error" | "success"; text: string; href?: string } | null>(null);
  const [busy, setBusy] = useState<"publish" | "discard" | "unpublish" | null>(null);
  const [uploading, setUploading] = useState(0);
  const [view, setView] = useState<"write" | "preview">("write");
  const [previewKey, setPreviewKey] = useState(0);

  const textarea = useRef<HTMLTextAreaElement>(null);
  const imageInput = useRef<HTMLInputElement>(null);
  const savedSlug = useRef(initial.hasDraft ? initial.slug : "");
  const dirty = useRef(false);

  const payload = useCallback(
    (): EditorPayload => ({ collection, slug, isNew, frontmatter, body, baseSha }),
    [collection, slug, isNew, frontmatter, body, baseSha],
  );

  const save = useCallback(async () => {
    if (!isValidSlug(slug)) return;
    setSaveState("saving");
    const result = await saveDraftAction(payload(), savedSlug.current || undefined);
    if (result.ok) {
      dirty.current = false;
      savedSlug.current = slug;
      setSaveState("saved");
      setSavedAt(result.updatedAt);
      setHasDraft(true);
      setPreviewKey((key) => key + 1);
      // Give a new post a real URL once its first draft exists.
      const url = `/admin/posts/${collection}/${slug}`;
      if (window.location.pathname !== url) window.history.replaceState(null, "", url);
    } else {
      setSaveState("error");
      setMessage({ kind: "error", text: result.error });
    }
  }, [collection, payload, slug]);

  // Autosave shortly after typing stops.
  useEffect(() => {
    if (!dirty.current) return;
    const timer = window.setTimeout(() => void save(), AUTOSAVE_MS);
    return () => window.clearTimeout(timer);
  }, [frontmatter, body, slug, save]);

  // Ctrl/Cmd+S saves now; leaving with unsaved changes asks first.
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "s") {
        event.preventDefault();
        void save();
      }
    };
    const onLeave = (event: BeforeUnloadEvent) => {
      if (dirty.current) event.preventDefault();
    };
    window.addEventListener("keydown", onKey);
    window.addEventListener("beforeunload", onLeave);
    return () => {
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("beforeunload", onLeave);
    };
  }, [save]);

  function touch() {
    dirty.current = true;
    setSaveState("unsaved");
    setMessage(null);
  }

  function setField<K extends keyof Frontmatter>(key: K, value: Frontmatter[K]) {
    touch();
    setFrontmatter((current) => ({ ...current, [key]: value }));
    if (key === "title" && isNew && !slugTouched) setSlug(slugify(String(value)));
  }

  // ------------------------------------------------------------ Markdown helpers

  function replaceSelection(transform: (selected: string) => { text: string; select?: [number, number] }) {
    const el = textarea.current;
    if (!el) return;
    const { selectionStart: start, selectionEnd: end } = el;
    const { text, select } = transform(body.slice(start, end));
    const next = body.slice(0, start) + text + body.slice(end);
    touch();
    setBody(next);
    requestAnimationFrame(() => {
      el.focus();
      const [a, b] = select ?? [start + text.length, start + text.length];
      el.setSelectionRange(start + a, start + b);
    });
  }

  const wrap = (before: string, after = before, placeholder = "text") =>
    replaceSelection((selected) => {
      const inner = selected || placeholder;
      return { text: `${before}${inner}${after}`, select: [before.length, before.length + inner.length] };
    });

  const prefixLines = (prefix: string) =>
    replaceSelection((selected) => {
      const text = (selected || "text")
        .split("\n")
        .map((line) => `${prefix}${line}`)
        .join("\n");
      return { text, select: [0, text.length] };
    });

  function insertAtCursor(text: string) {
    replaceSelection(() => ({ text }));
  }

  async function uploadAndInsert(files: File[]) {
    for (const file of files) {
      if (!file.type.startsWith("image/")) continue;
      setUploading((count) => count + 1);
      const result = await uploadImage(file);
      setUploading((count) => count - 1);
      if (result.ok) {
        const alt = file.name.replace(/\.[a-z0-9]+$/i, "").replace(/[-_]+/g, " ");
        insertAtCursor(`\n![${alt}](${result.path})\n`);
      } else {
        setMessage({ kind: "error", text: result.error });
      }
    }
  }

  // ------------------------------------------------------------ Publishing

  async function publish() {
    if (dirty.current) await save();
    setBusy("publish");
    setMessage(null);
    const result = await publishAction(payload());
    setBusy(null);
    if (!result.ok) {
      setMessage({ kind: "error", text: result.error });
      return;
    }
    dirty.current = false;
    setIsNew(false);
    setBaseSha(result.sha);
    setPublishedSha(result.sha);
    setHasDraft(false);
    setSaveState("idle");
    setMessage({
      kind: "success",
      text: result.commitUrl
        ? "Published. The site redeploys in about a minute."
        : "Published to the local folder.",
      href: result.commitUrl ?? undefined,
    });
    router.refresh();
  }

  async function discard() {
    if (!window.confirm("Throw away the unpublished changes and go back to the live version?")) return;
    setBusy("discard");
    const result = await discardDraftAction(collection, slug);
    setBusy(null);
    if (!result.ok) {
      setMessage({ kind: "error", text: result.error });
      return;
    }
    dirty.current = false;
    if (isNew) router.push("/admin/posts");
    else window.location.reload();
  }

  async function unpublish() {
    if (!publishedSha) return;
    const typed = window.prompt(`This removes the post from the site. Type "${slug}" to confirm.`);
    if (typed !== slug) return;
    setBusy("unpublish");
    const result = await unpublishAction(collection, slug, publishedSha);
    setBusy(null);
    if (!result.ok) {
      setMessage({ kind: "error", text: result.error });
      return;
    }
    dirty.current = false;
    router.push("/admin/posts");
    router.refresh();
  }

  // ------------------------------------------------------------ Render

  const slugOk = isValidSlug(slug);
  const words = body.trim() ? body.trim().split(/\s+/).length : 0;
  const status =
    uploading > 0
      ? "Uploading image…"
      : !slugOk
        ? "Add a title to start saving"
        : {
            idle: publishedSha ? "Matches the live version" : "Not saved yet",
            unsaved: "Unsaved changes",
            saving: "Saving…",
            saved: savedAt ? `Draft saved ${timeLabel(savedAt)}` : "Draft saved",
            error: "Couldn't save",
          }[saveState];

  const toolbar = [
    { label: "Heading", icon: TextHTwo, run: () => prefixLines("## ") },
    { label: "Bold", icon: TextB, run: () => wrap("**") },
    { label: "Italic", icon: TextItalic, run: () => wrap("*") },
    { label: "Link", icon: LinkSimple, run: () => wrap("[", "](https://)", "link text") },
    { label: "Quote", icon: Quotes, run: () => prefixLines("> ") },
    { label: "List", icon: ListBullets, run: () => prefixLines("- ") },
    { label: "Code", icon: Code, run: () => wrap("`") },
    { label: "Image", icon: ImageSquare, run: () => imageInput.current?.click() },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Link href="/admin/posts" className="text-sm text-secondary hover:text-foreground">
          ← {config.label}
        </Link>
        <div className="flex items-center gap-2 text-xs text-secondary">
          <span
            className={cn(
              "size-2 rounded-full",
              saveState === "error" ? "bg-red-500" : saveState === "saved" || saveState === "idle" ? "bg-sage" : "bg-amber-500",
            )}
          />
          <span aria-live="polite">{status}</span>
        </div>
      </div>

      {/* Metadata */}
      <section className="space-y-4">
        <input
          value={frontmatter.title}
          onChange={(event) => setField("title", event.target.value)}
          placeholder="Title"
          aria-label="Title"
          maxLength={200}
          className="w-full border-none bg-transparent font-display text-3xl font-medium tracking-tight outline-none placeholder:text-foreground/25 sm:text-4xl"
        />
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="block sm:col-span-2">
            <span className={labelClass}>Description</span>
            <textarea
              value={frontmatter.description}
              onChange={(event) => setField("description", event.target.value)}
              rows={2}
              maxLength={400}
              className={inputClass}
            />
            <span className={helpClass}>Shown under the title, on cards and in link previews.</span>
          </label>
          <label className="block">
            <span className={labelClass}>Date</span>
            <input
              value={frontmatter.date}
              onChange={(event) => setField("date", event.target.value)}
              placeholder={collection === "blog" ? "Sep 2026" : "09.2026"}
              maxLength={40}
              className={inputClass}
            />
          </label>
          <label className="block">
            <span className={labelClass}>URL</span>
            <div className="mt-1.5 flex items-center rounded-lg border border-border bg-muted/50 pl-3 text-sm">
              <span className="shrink-0 font-mono text-xs text-secondary">{config.publicPath}/</span>
              <input
                value={slug}
                onChange={(event) => {
                  touch();
                  setSlugTouched(true);
                  setSlug(event.target.value.toLowerCase().replace(/[^a-z0-9-]/g, "-"));
                }}
                readOnly={!isNew}
                maxLength={80}
                className="min-w-0 flex-1 bg-transparent px-1 py-2 font-mono text-xs outline-none read-only:text-secondary"
              />
            </div>
            <span className={helpClass}>
              {isNew ? "Fixed once published." : "Published posts keep their URL."}
              {slug && !slugOk && " Use lowercase words joined by hyphens."}
            </span>
          </label>
          <div className="sm:col-span-2">
            <span className={labelClass}>Cover image</span>
            <ImageField value={frontmatter.cover ?? ""} onChange={(value) => setField("cover", value || undefined)} />
          </div>
          {collection === "blog" ? (
            <label className="block sm:col-span-2">
              <span className={labelClass}>Originally published at</span>
              <input
                value={frontmatter.original ?? ""}
                onChange={(event) => setField("original", event.target.value || undefined)}
                placeholder="https://medium.com/…"
                className={inputClass}
              />
              <span className={helpClass}>Optional. Adds an &quot;Originally published on Medium&quot; line.</span>
            </label>
          ) : (
            <>
              <label className="block">
                <span className={labelClass}>Tech</span>
                <input
                  value={(frontmatter.tech ?? []).join(", ")}
                  onChange={(event) =>
                    setField(
                      "tech",
                      event.target.value.split(",").map((item) => item.trimStart()).filter((item, i, all) => item || i === all.length - 1),
                    )
                  }
                  placeholder="PyTorch, FastAPI, Docker"
                  className={inputClass}
                />
                <span className={helpClass}>Comma-separated.</span>
              </label>
              <label className="block">
                <span className={labelClass}>Full write-up link</span>
                <input
                  value={frontmatter.writeup ?? ""}
                  onChange={(event) => setField("writeup", event.target.value || undefined)}
                  placeholder="/blog/my-post"
                  className={inputClass}
                />
              </label>
            </>
          )}
        </div>
      </section>

      {/* Write / preview */}
      <section>
        <div className="mb-2 flex items-center justify-between gap-3">
          <div className="flex rounded-full border border-border p-0.5 text-sm lg:hidden">
            {(["write", "preview"] as const).map((mode) => (
              <button
                key={mode}
                type="button"
                onClick={() => setView(mode)}
                className={cn(
                  "rounded-full px-3 py-1 capitalize",
                  view === mode ? "bg-foreground text-background" : "text-secondary",
                )}
              >
                {mode}
              </button>
            ))}
          </div>
          <p className="text-xs text-secondary">
            {words} words · {readingMinutes(body)} min read
          </p>
        </div>

        <div className="grid gap-4 lg:grid-cols-2">
          <div className={cn(view === "preview" && "hidden lg:block")}>
            <div className="flex flex-wrap gap-0.5 rounded-t-xl border border-b-0 border-border bg-muted/50 p-1">
              {toolbar.map((tool) => (
                <button
                  key={tool.label}
                  type="button"
                  onClick={tool.run}
                  title={tool.label}
                  aria-label={tool.label}
                  className="flex size-8 items-center justify-center rounded-md text-secondary transition-colors hover:bg-background hover:text-foreground"
                >
                  <tool.icon className="size-4" />
                </button>
              ))}
            </div>
            <textarea
              ref={textarea}
              value={body}
              onChange={(event) => {
                touch();
                setBody(event.target.value);
              }}
              onPaste={(event) => {
                const files = [...event.clipboardData.files];
                if (files.length) {
                  event.preventDefault();
                  void uploadAndInsert(files);
                }
              }}
              onDrop={(event) => {
                const files = [...event.dataTransfer.files];
                if (files.length) {
                  event.preventDefault();
                  void uploadAndInsert(files);
                }
              }}
              placeholder={"Write in Markdown / MDX.\n\n## A section heading\n\nPaste or drop images to upload them."}
              spellCheck
              className="block min-h-[60vh] w-full resize-y rounded-b-xl border border-border bg-background p-4 font-mono text-sm leading-relaxed outline-none focus:border-sage-border"
            />
            <input
              ref={imageInput}
              type="file"
              accept="image/jpeg,image/png,image/webp,image/gif,image/avif"
              multiple
              className="hidden"
              onChange={(event) => {
                void uploadAndInsert([...(event.target.files ?? [])]);
                event.target.value = "";
              }}
            />
          </div>

          <div className={cn("min-h-[60vh]", view === "write" && "hidden lg:block")}>
            {hasDraft || publishedSha ? (
              <div className="relative h-full overflow-hidden rounded-xl border border-border">
                <iframe
                  key={previewKey}
                  src={`/preview/${collection}/${slug}?v=${previewKey}`}
                  title="Preview"
                  className="h-full min-h-[60vh] w-full bg-background"
                />
                <a
                  href={`/preview/${collection}/${slug}`}
                  target="_blank"
                  className="absolute right-2 top-2 inline-flex items-center gap-1 rounded-full border border-border bg-background/90 px-2.5 py-1 text-xs text-secondary hover:text-foreground"
                >
                  Open <ArrowSquareOut className="size-3" />
                </a>
              </div>
            ) : (
              <div className="flex h-full min-h-[60vh] items-center justify-center rounded-xl border border-dashed border-border p-6 text-center text-sm text-secondary">
                The preview appears once the first draft is saved.
              </div>
            )}
          </div>
        </div>
      </section>

      {message && (
        <p
          role={message.kind === "error" ? "alert" : "status"}
          className={cn(
            "rounded-xl border px-4 py-3 text-sm",
            message.kind === "error"
              ? "border-red-500/30 bg-red-500/10 text-red-700 dark:text-red-400"
              : "border-sage-border bg-sage-soft text-sage",
          )}
        >
          {message.text}{" "}
          {message.href && (
            <a href={message.href} target="_blank" rel="noopener noreferrer" className="underline">
              View commit ↗
            </a>
          )}
          {message.kind === "success" && (
            <>
              {" · "}
              <a href={`${config.publicPath}/${slug}`} target="_blank" className="underline">
                Open post ↗
              </a>
            </>
          )}
        </p>
      )}

      {/* Actions */}
      <div className="sticky bottom-0 z-20 -mx-4 flex flex-wrap items-center justify-end gap-2 border-t border-border bg-background/90 px-4 py-3 backdrop-blur">
        {publishedSha && (
          <button type="button" onClick={() => void unpublish()} disabled={busy !== null} className={cn(dangerButtonClass, "mr-auto")}>
            {busy === "unpublish" ? "Removing…" : "Unpublish"}
          </button>
        )}
        {hasDraft && (
          <button type="button" onClick={() => void discard()} disabled={busy !== null} className={secondaryButtonClass}>
            {busy === "discard" ? "Discarding…" : isNew ? "Delete draft" : "Discard changes"}
          </button>
        )}
        <button
          type="button"
          onClick={() => void save()}
          disabled={!slugOk || saveState === "saving" || busy !== null}
          className={secondaryButtonClass}
        >
          Save draft
        </button>
        <button
          type="button"
          onClick={() => void publish()}
          disabled={!slugOk || busy !== null || uploading > 0 || (!hasDraft && !dirty.current && Boolean(publishedSha))}
          className={primaryButtonClass}
        >
          {busy === "publish" ? "Publishing…" : publishedSha ? "Publish changes" : "Publish"}
        </button>
      </div>
    </div>
  );
}
