import { isValidElement, type ReactNode } from "react";

/** URL-safe anchor id for a heading's text. */
export function slugify(text: string) {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, "")
    .trim()
    .replace(/[\s-]+/g, "-");
}

/** Plain text of rendered heading children (strings, numbers, nested elements). */
export function textOf(node: ReactNode): string {
  if (typeof node === "string" || typeof node === "number") return String(node);
  if (Array.isArray(node)) return node.map(textOf).join("");
  if (isValidElement<{ children?: ReactNode }>(node)) return textOf(node.props.children);
  return "";
}

export type Heading = { id: string; text: string };

/** Level-2 headings ("## ...") in an MDX source, in order. */
export function extractHeadings(source: string): Heading[] {
  return [...source.matchAll(/^##\s+(.+?)\s*$/gm)].map(([, raw]) => {
    const text = raw!.replace(/[*_`]/g, "");
    return { id: slugify(text), text };
  });
}

/** Rough reading time at ~220 words per minute. */
export function readingMinutes(source: string) {
  const words = source.trim().split(/\s+/).length;
  return Math.max(1, Math.round(words / 220));
}
