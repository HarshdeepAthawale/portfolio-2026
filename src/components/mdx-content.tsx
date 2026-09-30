import type { ComponentProps } from "react";
import { MDXRemote } from "next-mdx-remote/rsc";
import { mdxOptions } from "@/lib/mdx-options";
import { slugify, textOf } from "@/lib/headings";

// Give h2s anchor ids so the table of contents can link to them.
const components = {
  h2: ({ children, ...props }: ComponentProps<"h2">) => (
    <h2 id={slugify(textOf(children))} className="scroll-mt-24" {...props}>
      {children}
    </h2>
  ),
};

export function MdxContent({
  source,
  mapSrc,
}: {
  source: string;
  /** Rewrites image URLs (the admin preview serves not-yet-deployed uploads). */
  mapSrc?: (src: string) => string;
}) {
  const withImages = mapSrc
    ? {
        ...components,
        img: ({ src, alt, ...props }: ComponentProps<"img">) => (
          // eslint-disable-next-line @next/next/no-img-element -- mirrors plain markdown images
          <img src={typeof src === "string" ? mapSrc(src) : src} alt={alt ?? ""} {...props} />
        ),
      }
    : components;

  return <MDXRemote source={source} components={withImages} options={{ mdxOptions }} />;
}
