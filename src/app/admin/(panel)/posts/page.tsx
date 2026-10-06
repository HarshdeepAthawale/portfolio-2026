import type { Metadata } from "next";
import Link from "next/link";
import { cardClass, primaryButtonClass, secondaryButtonClass } from "@/app/admin/_components/styles";
import { COLLECTIONS, listPosts, type Collection, type PostSummary } from "@/lib/admin/posts";

export const metadata: Metadata = { title: "Posts" };

function Status({ post }: { post: PostSummary }) {
  if (!post.published) {
    return (
      <span className="rounded-sm border border-amber-500/30 bg-amber-500/10 px-2 py-0.5 text-[11px] text-amber-700 dark:text-amber-400">
        Draft
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1.5">
      <span className="rounded-sm border border-sun-border bg-sun-soft px-2 py-0.5 text-[11px] text-sun">
        Published
      </span>
      {post.hasDraft && (
        <span className="rounded-sm border border-border px-2 py-0.5 text-[11px] text-secondary">
          Unpublished edits
        </span>
      )}
    </span>
  );
}

async function CollectionList({ collection }: { collection: Collection }) {
  const posts = await listPosts(collection);
  const config = COLLECTIONS[collection];

  return (
    <section className={cardClass}>
      <div className="flex items-center justify-between gap-3">
        <h2 className="font-display text-xl font-medium tracking-tight">{config.label}</h2>
        <Link
          href={`/admin/posts/${collection}/new`}
          className={collection === "blog" ? primaryButtonClass : secondaryButtonClass}
        >
          New {config.singular.toLowerCase()}
        </Link>
      </div>
      {posts.length === 0 ? (
        <p className="mt-4 text-sm text-secondary">Nothing here yet.</p>
      ) : (
        <ul className="mt-3 divide-y divide-border">
          {posts.map((post) => (
            <li key={post.slug} className="flex flex-col gap-1.5 py-3 sm:flex-row sm:items-center sm:gap-4">
              <Link
                href={`/admin/posts/${collection}/${post.slug}`}
                className="min-w-0 flex-1 font-medium hover:text-sun"
              >
                <span className="block truncate">{post.title}</span>
                <span className="block truncate font-mono text-[11px] font-normal text-secondary">
                  {config.publicPath}/{post.slug}
                </span>
              </Link>
              <div className="flex shrink-0 items-center gap-3 text-xs text-secondary">
                <Status post={post} />
                {post.date && <span>{post.date}</span>}
                {post.published && (
                  <a
                    href={`${config.publicPath}/${post.slug}`}
                    target="_blank"
                    className="hover:text-foreground"
                  >
                    View ↗
                  </a>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

export default function PostsPage() {
  return (
    <div className="space-y-6">
      <div>
        <p className="font-mono text-xs uppercase tracking-[0.15em] text-secondary">Posts</p>
        <h1 className="font-display mt-1 text-3xl font-medium tracking-tight">Write & publish</h1>
        <p className="mt-2 max-w-xl text-sm text-secondary">
          Drafts save privately as you type. Publishing commits the post to the repo and the site
          redeploys in about a minute.
        </p>
      </div>
      <CollectionList collection="blog" />
      <CollectionList collection="projects" />
    </div>
  );
}
