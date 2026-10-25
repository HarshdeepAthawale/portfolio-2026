"use client";

import { useState } from "react";
import Image from "next/image";
import { useWorld } from "./world";
import type { ContentItem } from "@/lib/mdx";
import { GameButton, GameScreen } from "./ui";

export function MinecraftBlog({ posts }: { posts: Omit<ContentItem, "content">[] }) {
  const { navigate } = useWorld();
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState<string | null>(null);
  const filtered = posts.filter(post => `${post.title} ${post.description}`.toLocaleLowerCase().includes(query.trim().toLocaleLowerCase()));
  const current = filtered.find(post => post.slug === selected);
  const open = (slug: string) => navigate(`/blog/${slug}`);
  return <GameScreen title="Blog" className="mc-blog-screen" actions={<><GameButton disabled={!current} onClick={() => { if (current) open(current.slug); }}>Open Article</GameButton><GameButton href="/">Back</GameButton></>}>
    <div className="blog-search-wrap">
      <label htmlFor="blog-search" className="sr-only">Search blog posts</label>
      <input id="blog-search" type="search" className="blog-search" placeholder="Search…" value={query} onChange={event => setQuery(event.target.value)} onKeyDown={event => { if (event.key === "Escape") { event.preventDefault(); setQuery(""); event.currentTarget.blur(); } }} />
    </div>
    <section className="blog-world-panel" aria-label="Blog posts">
      <p id="blog-open-help" className="sr-only">Click a post to select it. Double-click or press Enter to open it, or use the Open Article button.</p>
      <div className="blog-world-scroll"><div className="blog-world-list">
        {filtered.map(post => <button type="button" key={post.slug} className="blog-world-row" aria-pressed={current?.slug === post.slug} aria-describedby="blog-open-help" onClick={() => setSelected(post.slug)} onDoubleClick={() => open(post.slug)} onKeyDown={event => { if (event.key === "Enter") { event.preventDefault(); open(post.slug); } }}>
          <span className="blog-world-cover">{post.cover ? <Image src={post.cover} alt="" width={80} height={80} sizes="80px" /> : <svg viewBox="0 0 24 24" width="32" height="32" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true"><path d="M12 7v14M3 18a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1h5a4 4 0 0 1 4 4 4 4 0 0 1 4-4h5a1 1 0 0 1 1 1v13a1 1 0 0 1-1 1h-6a3 3 0 0 0-3 3 3 3 0 0 0-3-3Z" /></svg>}<span className="blog-world-play" aria-hidden="true">▶</span></span>
          <span className="blog-world-copy"><span className="blog-world-title">{post.title}</span><span className="blog-world-description">{post.description}</span><span className="blog-world-meta">{post.date} · Security, Research</span></span>
        </button>)}
        {!filtered.length && <div className="blog-empty"><p>{posts.length ? "No posts found." : "No posts yet."}</p><p>{posts.length ? "Try another title or topic." : "A new world is on its way."}</p>{query && <button className="blog-clear" type="button" onClick={() => setQuery("")}>Clear search</button>}</div>}
      </div></div>
    </section>
    <p className="blog-list-status" role="status">{filtered.length} {filtered.length === 1 ? "post" : "posts"}{query ? " found" : ""}</p>
  </GameScreen>;
}
