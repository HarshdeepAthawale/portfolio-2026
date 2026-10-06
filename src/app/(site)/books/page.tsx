import Link from "next/link";
import { Container } from "@/components/container";
import { MediaCoverGrid } from "@/components/media-cover-grid";
import { books } from "@/config/books";

export const metadata = {
  title: "Books - Harshdeep Athawale",
  description: "A collection of books that made me pause, think, and see things differently.",
};

export default function BooksPage() {
  return (
    <div className="pb-16 pt-8">
      <Container className="space-y-10">
        <header>
          <p className="font-mono text-xs uppercase tracking-[0.18em] text-secondary">On the shelf</p>
          <h1 className="font-display mt-2 text-4xl leading-[1.05] sm:text-5xl">Books</h1>
          <p className="mt-4 max-w-xl text-base leading-relaxed text-secondary">
            Books I&apos;ve read and genuinely enjoyed. Some changed how I think, some taught me
            something new, and some stayed in my head long after I finished them.
          </p>
        </header>

        {books.length > 0 ? (
          <MediaCoverGrid items={books} />
        ) : (
          <div className="corner-frame px-6 py-12 text-center">
            <p className="font-mono text-xs uppercase tracking-[0.18em] text-secondary">Shelf in progress</p>
            <p className="mt-3 text-secondary">
              The reading list is on its way. Meanwhile, here are my{" "}
              <Link href="/favourites" className="link-underline text-foreground">
                favourite films and series
              </Link>
              .
            </p>
          </div>
        )}
      </Container>
    </div>
  );
}
