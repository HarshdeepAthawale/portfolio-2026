import { compileMDX } from "next-mdx-remote/rsc";
import remarkGfm from "remark-gfm";

export const mdxOptions = { remarkPlugins: [remarkGfm] };

/**
 * Compiles MDX the same way the site does and returns the error message, or null
 * if it compiles. Publishing checks this, so a typo can't break the site's build.
 */
export async function mdxCompileError(source: string): Promise<string | null> {
  try {
    await compileMDX({ source, options: { mdxOptions } });
    return null;
  } catch (error) {
    if (!(error instanceof Error)) return "The MDX doesn't compile.";
    // Drop next-mdx-remote's prefix; the first remaining line says what and where.
    const detail = error.message
      .replace("[next-mdx-remote] error compiling MDX:", "")
      .split("\n")
      .map((line) => line.trim())
      .find(Boolean);
    return detail ?? "The MDX doesn't compile.";
  }
}
