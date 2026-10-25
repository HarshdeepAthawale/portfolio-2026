import Image from "next/image";
import Link from "next/link";
import { GameScreen } from "@/components/minecraft/ui";
import { MdxContent } from "@/components/mdx-content";
import { heroConfig } from "@/config/hero";
import { readingMinutes } from "@/lib/headings";

export type ArticlePost = {
  slug: string;
  title: string;
  description: string;
  date: string;
  cover?: string;
  original?: string;
  content: string;
};

/** Public and admin-preview articles share the reference's readable article skin. */
export function BlogArticle({ post, mapSrc, children }: {
  post: ArticlePost;
  mapSrc?: (src: string) => string;
  children?: React.ReactNode;
}) {
  const cover = post.cover && mapSrc ? mapSrc(post.cover) : post.cover;
  return <GameScreen backHref="/blog" className="mc-blog-article-screen">
    <div className="mc-blog-article-scroll" tabIndex={0} role="region" aria-label={`${post.title} article`}>
      <nav className="blog-breadcrumb" aria-label="Breadcrumb"><Link href="/blog">← Blog</Link><span>{readingMinutes(post.content)} min read</span></nav>
      <div className="blog-article-panel">
        {cover && <div className="blog-hero"><Image src={cover} alt="" width={1200} height={630} sizes="(min-width: 1080px) 1080px, 100vw" priority unoptimized={Boolean(mapSrc)} /></div>}
        <div className="blog-publication-meta"><time>{post.date}</time><span>·</span><span>{heroConfig.name}</span>{post.original && <><span>·</span><a href={post.original} target="_blank" rel="noopener noreferrer">Originally on Medium ↗</a></>}</div>
        <article className="rb-article rb-theme-portfolio"><div className="rb-article-inner">
          <header className="rb-header"><h1 className="rb-title">{post.title}</h1><p className="rb-subtitle">{post.description}</p><div className="rb-tags"><span className="rb-tag">Security</span><span className="rb-tag">Research</span></div></header>
          <div id="post-body" className="rb-body"><MdxContent source={post.content} mapSrc={mapSrc} /></div>
          {children}
        </div></article>
      </div>
    </div>
  </GameScreen>;
}
