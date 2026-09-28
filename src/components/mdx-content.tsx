import type { ComponentProps } from "react";
import { MDXRemote } from "next-mdx-remote/rsc";
import remarkGfm from "remark-gfm";
import { slugify, textOf } from "@/lib/headings";

// Give h2s anchor ids so the table of contents can link to them.
const components = {
  h2: ({ children, ...props }: ComponentProps<"h2">) => (
    <h2 id={slugify(textOf(children))} className="scroll-mt-24" {...props}>
      {children}
    </h2>
  ),
};

export function MdxContent({ source }: { source: string }) {
  return (
    <MDXRemote
      source={source}
      components={components}
      options={{
        mdxOptions: {
          remarkPlugins: [remarkGfm],
        },
      }}
    />
  );
}
