// Content lives in content/data/favourites.json (editable from /admin).
import data from "../../content/data/favourites.json";

export type Favourite = {
  title: string;
  cover: string;
  /** Release year, or a span for series ("2015-2019"). */
  year?: string;
  /** Director, creator or author. */
  by?: string;
  language?: string;
  /** A line on why it stuck with you. */
  note?: string;
};

export const favouriteMovies: Favourite[] = data.movies;
export const favouriteSeries: Favourite[] = data.series;
export const favouriteBooks: Favourite[] = data.books;
