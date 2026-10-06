import { Container } from "@/components/container";
import { MediaCoverGrid } from "@/components/media-cover-grid";
import { SectionHeading } from "@/components/section-heading";
import { favouriteBooks, favouriteMovies, favouriteSeries } from "@/config/favourites";

export const metadata = {
  title: "Favourites - Harshdeep Athawale",
  description: "Stories I've enjoyed and connected with across movies, series and books.",
};

export default function FavouritesPage() {
  // Each shelf shows only when it has something on it.
  const shelves = [
    { title: "Movies", items: favouriteMovies },
    { title: "Series", items: favouriteSeries },
    { title: "Books", items: favouriteBooks },
  ].filter((shelf) => shelf.items.length > 0);
  const total = shelves.reduce((sum, shelf) => sum + shelf.items.length, 0);

  return (
    <div className="pb-16 pt-8">
      <Container className="space-y-14">
        <header>
          <p className="font-mono text-xs uppercase tracking-[0.18em] text-secondary">
            Off the clock · {total} picks
          </p>
          <h1 className="font-display mt-2 text-4xl leading-[1.05] sm:text-5xl">Favourites</h1>
          <p className="mt-4 max-w-xl text-base leading-relaxed text-secondary">
            Stories I&apos;ve enjoyed and connected with. Some inspired me, some made me think,
            and some I just genuinely loved watching.
          </p>
        </header>

        {shelves.map((shelf) => (
          <section key={shelf.title}>
            <SectionHeading title={shelf.title} uppercase index={shelf.items.length} className="mb-6" />
            <MediaCoverGrid items={shelf.items} />
          </section>
        ))}
      </Container>
    </div>
  );
}
