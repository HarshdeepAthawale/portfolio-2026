import Link from "next/link";
import { MediaCoverGrid } from "@/components/media-cover-grid";
import { GameScreen } from "@/components/minecraft/ui";
import { GameScroll } from "@/components/minecraft/game-scroll";
import { books } from "@/config/books";

export const metadata = {
  title: "Books - Harshdeep Athawale",
  description: "A collection of books that made me pause, think, and see things differently.",
};

export default function BooksPage() {
  return <GameScreen title="Books" backHref="/about">
    <GameScroll className="mc-dark-panel mc-collection-scroll" aria-label="Reading list">
      <div className="mc-collection-content">
        <header className="mc-detail-card"><p>Books I’ve read and enjoyed. Some changed how I think, some taught me something new, and some stayed with me long after I finished them.</p></header>
        {books.length > 0 ? <MediaCoverGrid items={books} /> : <div className="mc-empty">
          <p>Shelf in progress</p><span>The reading list is on its way. Meanwhile, here are my <Link href="/favourites" className="mc-inline-link">favourite films and series</Link>.</span>
        </div>}
      </div>
    </GameScroll>
  </GameScreen>;
}
