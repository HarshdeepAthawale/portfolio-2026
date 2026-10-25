import { MediaCoverGrid } from "@/components/media-cover-grid";
import { GameScreen } from "@/components/minecraft/ui";
import { GameScroll } from "@/components/minecraft/game-scroll";
import { favouriteBooks, favouriteMovies, favouriteSeries } from "@/config/favourites";

export const metadata = {
  title: "Favourites - Harshdeep Athawale",
  description: "Stories I've enjoyed and connected with across movies, series and books.",
};

export default function FavouritesPage() {
  const shelves = [
    { title: "Movies", items: favouriteMovies },
    { title: "Series", items: favouriteSeries },
    { title: "Books", items: favouriteBooks },
  ].filter(shelf => shelf.items.length > 0);
  const total = shelves.reduce((sum, shelf) => sum + shelf.items.length, 0);
  return <GameScreen title="Favourites" backHref="/about">
    <GameScroll className="mc-dark-panel mc-collection-scroll" aria-label="Favourite movies, series and books">
      <div className="mc-collection-content">
        <header className="mc-detail-card"><span className="mc-detail-date">Off the clock · {total} picks</span><p>Stories I’ve enjoyed and connected with. Some inspired me, some made me think, and some I loved watching.</p></header>
        {shelves.map(shelf => <section className="mc-media-shelf" key={shelf.title}>
          <h2>{shelf.title} <span>{shelf.items.length} items</span></h2>
          <MediaCoverGrid items={shelf.items} />
        </section>)}
      </div>
    </GameScroll>
  </GameScreen>;
}
