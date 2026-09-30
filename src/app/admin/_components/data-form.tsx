"use client";

import { ArrowDown, ArrowUp, CaretRight, Plus, Trash, X } from "@phosphor-icons/react";
import { useEffect, useRef, useState } from "react";
import { saveDataAction } from "@/app/admin/_actions/data";
import { ImageField } from "@/app/admin/_components/image-field";
import {
  helpClass,
  inputClass,
  labelClass,
  primaryButtonClass,
  secondaryButtonClass,
} from "@/app/admin/_components/styles";
import { getDataSection, type DataSection, type Field } from "@/lib/admin/schemas";
import { cn } from "@/lib/utils";

type Value = unknown;
type Obj = Record<string, unknown>;

// ------------------------------------------------------------------ Fields

function TagsInput({ value, onChange }: { value: string[]; onChange: (v: string[]) => void }) {
  const [draft, setDraft] = useState("");
  const add = () => {
    const items = draft.split(",").map((item) => item.trim()).filter(Boolean);
    if (items.length) onChange([...value, ...items.filter((item) => !value.includes(item))]);
    setDraft("");
  };
  return (
    <div className="mt-1.5 flex flex-wrap items-center gap-1.5 rounded-lg border border-border bg-background p-1.5">
      {value.map((tag, i) => (
        <span key={`${tag}-${i}`} className="inline-flex items-center gap-1 rounded-full border border-border bg-muted px-2 py-0.5 font-mono text-xs">
          {tag}
          <button type="button" aria-label={`Remove ${tag}`} onClick={() => onChange(value.filter((_, j) => j !== i))}>
            <X className="size-3" />
          </button>
        </span>
      ))}
      <input
        value={draft}
        onChange={(event) => setDraft(event.target.value)}
        onKeyDown={(event) => {
          if (event.key === "Enter" || event.key === ",") {
            event.preventDefault();
            add();
          } else if (event.key === "Backspace" && !draft && value.length) {
            onChange(value.slice(0, -1));
          }
        }}
        onBlur={add}
        placeholder={value.length ? "" : "Type and press Enter"}
        className="min-w-24 flex-1 bg-transparent px-1 py-0.5 text-sm outline-none"
      />
    </div>
  );
}

function move<T>(items: T[], from: number, to: number) {
  const next = [...items];
  const [item] = next.splice(from, 1);
  next.splice(to, 0, item);
  return next;
}

function RowControls({
  index,
  count,
  onMove,
  onRemove,
  label,
}: {
  index: number;
  count: number;
  onMove: (to: number) => void;
  onRemove: () => void;
  label: string;
}) {
  const button = "flex size-7 items-center justify-center rounded-md text-secondary hover:bg-muted hover:text-foreground disabled:opacity-30";
  return (
    <div className="flex shrink-0 items-center">
      <button type="button" className={button} disabled={index === 0} onClick={() => onMove(index - 1)} aria-label={`Move ${label} up`}>
        <ArrowUp className="size-3.5" />
      </button>
      <button type="button" className={button} disabled={index === count - 1} onClick={() => onMove(index + 1)} aria-label={`Move ${label} down`}>
        <ArrowDown className="size-3.5" />
      </button>
      <button
        type="button"
        className={cn(button, "hover:text-red-600")}
        onClick={() => {
          if (window.confirm(`Remove ${label}?`)) onRemove();
        }}
        aria-label={`Remove ${label}`}
      >
        <Trash className="size-3.5" />
      </button>
    </div>
  );
}

function ListField({
  field,
  value,
  onChange,
}: {
  field: Extract<Field, { kind: "list" }>;
  value: Obj[];
  onChange: (v: Obj[]) => void;
}) {
  const [open, setOpen] = useState<number | null>(null);
  const titleOf = (item: Obj, i: number) =>
    field.itemTitle.map((key) => item[key]).filter(Boolean).join(" · ") || `Item ${i + 1}`;

  return (
    <div className="mt-1.5 space-y-2">
      {value.map((item, i) => {
        const title = titleOf(item, i);
        const expanded = open === i;
        return (
          <div key={i} className="rounded-xl border border-border bg-background">
            <div className="flex items-center gap-2 pl-3 pr-1">
              <button
                type="button"
                onClick={() => setOpen(expanded ? null : i)}
                aria-expanded={expanded}
                className="flex min-w-0 flex-1 items-center gap-2 py-2.5 text-left text-sm font-medium"
              >
                <CaretRight className={cn("size-3.5 shrink-0 text-secondary transition-transform", expanded && "rotate-90")} />
                <span className="truncate">{title}</span>
              </button>
              <RowControls
                index={i}
                count={value.length}
                label={title}
                onMove={(to) => {
                  onChange(move(value, i, to));
                  setOpen(expanded ? to : open);
                }}
                onRemove={() => {
                  onChange(value.filter((_, j) => j !== i));
                  setOpen(null);
                }}
              />
            </div>
            {expanded && (
              <div className="border-t border-border p-3 sm:p-4">
                <Fields fields={field.fields} value={item} onChange={(next) => onChange(value.map((old, j) => (j === i ? next : old)))} />
              </div>
            )}
          </div>
        );
      })}
      <button
        type="button"
        onClick={() => {
          onChange([...value, structuredClone(field.newItem)]);
          setOpen(value.length);
        }}
        className="inline-flex items-center gap-1 text-sm text-sage hover:underline"
      >
        <Plus className="size-3.5" /> Add {field.label.toLowerCase().replace(/s$/, "")}
      </button>
    </div>
  );
}

function FieldInput({ field, value, onChange }: { field: Field; value: Value; onChange: (v: Value) => void }) {
  switch (field.kind) {
    case "text":
      return <input value={String(value ?? "")} onChange={(e) => onChange(e.target.value)} placeholder={field.placeholder} className={inputClass} />;
    case "textarea":
      return <textarea value={String(value ?? "")} onChange={(e) => onChange(e.target.value)} rows={field.rows ?? 3} className={inputClass} />;
    case "number":
      return (
        <input
          type="number"
          value={typeof value === "number" ? value : ""}
          onChange={(e) => onChange(e.target.value === "" ? undefined : Number(e.target.value))}
          className={inputClass}
        />
      );
    case "select":
      return (
        <select value={String(value ?? "")} onChange={(e) => onChange(e.target.value)} className={inputClass}>
          {field.options.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      );
    case "tags":
      return <TagsInput value={Array.isArray(value) ? (value as string[]) : []} onChange={onChange} />;
    case "image":
      return <ImageField value={String(value ?? "")} onChange={onChange} />;
    case "paragraphs":
    case "images": {
      const items = Array.isArray(value) ? (value as string[]) : [];
      const noun = field.kind === "images" ? "image" : (field.itemLabel ?? "item").toLowerCase();
      return (
        <div className="mt-1.5 space-y-2">
          {items.map((item, i) => (
            <div key={i} className="flex items-start gap-2">
              <div className="min-w-0 flex-1">
                {field.kind === "images" ? (
                  <ImageField value={item} onChange={(v) => onChange(items.map((old, j) => (j === i ? v : old)))} />
                ) : (
                  <textarea
                    value={item}
                    rows={2}
                    onChange={(e) => onChange(items.map((old, j) => (j === i ? e.target.value : old)))}
                    className={cn(inputClass, "mt-0")}
                  />
                )}
              </div>
              <RowControls
                index={i}
                count={items.length}
                label={`${noun} ${i + 1}`}
                onMove={(to) => onChange(move(items, i, to))}
                onRemove={() => onChange(items.filter((_, j) => j !== i))}
              />
            </div>
          ))}
          <button type="button" onClick={() => onChange([...items, ""])} className="inline-flex items-center gap-1 text-sm text-sage hover:underline">
            <Plus className="size-3.5" /> Add {noun}
          </button>
        </div>
      );
    }
    case "object":
      return (
        <div className="mt-1.5 rounded-xl border border-border p-3">
          <Fields fields={field.fields} value={(value as Obj) ?? {}} onChange={onChange} />
        </div>
      );
    case "list":
      return <ListField field={field} value={Array.isArray(value) ? (value as Obj[]) : []} onChange={onChange} />;
    case "boolean":
      return null;
  }
}

function Fields({ fields, value, onChange }: { fields: Field[]; value: Obj; onChange: (v: Obj) => void }) {
  const set = (key: string, v: Value) => onChange({ ...value, [key]: v });
  return (
    <div className="grid gap-4 sm:grid-cols-2">
      {fields.map((field) => {
        const wide = !["text", "number", "select", "boolean"].includes(field.kind);
        if (field.kind === "boolean") {
          return (
            <label key={field.key} className="flex items-center gap-2.5 self-end py-2 text-sm">
              <input
                type="checkbox"
                checked={value[field.key] === true}
                onChange={(e) => set(field.key, e.target.checked)}
                className="size-4 accent-[var(--color-sage)]"
              />
              {field.label}
            </label>
          );
        }
        return (
          <div key={field.key} className={cn(wide && "sm:col-span-2")}>
            <span className={labelClass}>
              {field.label}
              {field.required && <span className="text-secondary"> *</span>}
            </span>
            <FieldInput field={field} value={value[field.key]} onChange={(v) => set(field.key, v)} />
            {field.help && <p className={helpClass}>{field.help}</p>}
          </div>
        );
      })}
    </div>
  );
}

// ------------------------------------------------------------------ Form

export function DataForm({ sectionKey, initial, sha }: { sectionKey: DataSection["key"]; initial: unknown; sha: string }) {
  const section = getDataSection(sectionKey)!;
  const [value, setValue] = useState<unknown>(initial);
  const [version, setVersion] = useState(sha);
  const [dirty, setDirty] = useState(false);
  const [saving, setSaving] = useState(false);
  const [result, setResult] = useState<{ kind: "error" | "success"; text: string; problems?: string[]; href?: string } | null>(null);
  const baseline = useRef(JSON.stringify(initial));

  useEffect(() => {
    const onLeave = (event: BeforeUnloadEvent) => {
      if (dirty) event.preventDefault();
    };
    window.addEventListener("beforeunload", onLeave);
    return () => window.removeEventListener("beforeunload", onLeave);
  }, [dirty]);

  function update(next: unknown) {
    setValue(next);
    setDirty(JSON.stringify(next) !== baseline.current);
    setResult(null);
  }

  async function save() {
    setSaving(true);
    const res = await saveDataAction(section.key, value, version);
    setSaving(false);
    if (!res.ok) {
      setResult({ kind: "error", text: res.error });
      return;
    }
    if (!res.saved) {
      setResult({ kind: "error", text: "Fix these first:", problems: res.problems });
      return;
    }
    baseline.current = JSON.stringify(value);
    setVersion(res.sha);
    setDirty(false);
    setResult({
      kind: "success",
      text: res.commitUrl ? "Saved. The site redeploys in about a minute." : "Saved to the local folder.",
      href: res.commitUrl ?? undefined,
    });
  }

  return (
    <div className="space-y-6">
      {section.root.kind === "object" ? (
        <Fields fields={section.root.fields} value={(value as Obj) ?? {}} onChange={update} />
      ) : (
        <ListField
          field={{ ...section.root, key: section.key, label: section.title }}
          value={Array.isArray(value) ? (value as Obj[]) : []}
          onChange={update}
        />
      )}

      {result && (
        <div
          role={result.kind === "error" ? "alert" : "status"}
          className={cn(
            "rounded-xl border px-4 py-3 text-sm",
            result.kind === "error" ? "border-red-500/30 bg-red-500/10 text-red-700 dark:text-red-400" : "border-sage-border bg-sage-soft text-sage",
          )}
        >
          {result.text}{" "}
          {result.href && (
            <a href={result.href} target="_blank" rel="noopener noreferrer" className="underline">
              View commit ↗
            </a>
          )}
          {result.problems && (
            <ul className="mt-2 list-disc space-y-0.5 pl-5">
              {result.problems.map((problem) => (
                <li key={problem}>{problem}</li>
              ))}
            </ul>
          )}
        </div>
      )}

      <div className="sticky bottom-0 z-20 -mx-4 flex items-center justify-end gap-2 border-t border-border bg-background/90 px-4 py-3 backdrop-blur">
        <span className="mr-auto text-xs text-secondary">{dirty ? "Unsaved changes" : "No changes"}</span>
        <button
          type="button"
          disabled={!dirty || saving}
          onClick={() => {
            update(JSON.parse(baseline.current));
          }}
          className={secondaryButtonClass}
        >
          Reset
        </button>
        <button type="button" disabled={!dirty || saving} onClick={() => void save()} className={primaryButtonClass}>
          {saving ? "Saving…" : "Save & publish"}
        </button>
      </div>
    </div>
  );
}
