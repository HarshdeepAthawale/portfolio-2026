/**
 * The /site "editor": a wheel of entries, each opening a terminal session that
 * types itself out. Everything here is plain, serialisable data built on the
 * server and played back on the client.
 */

/** A simple-icons style glyph: one path in a square box. */
export type Icon = { path: string; box?: number; title?: string };

/**
 * One piece of a terminal line:
 * - a bare string,
 * - [text, className?, href?],
 * - a share gauge (█░ cells, sized to the buffer on the client),
 * - an icon (falls back to a boxed letter).
 */
export type Seg =
  | string
  | [text: string, cls?: string, href?: string]
  | { gauge: number; used: number }
  | { icon: Icon | null; letter: string };

export type Out = { segs: Seg[]; cls?: string };

export type Day = { date: string; count: number; level: number };

export type Shot = { file: string; name: string; alt: string };

export type ArchiveCard = {
  id: string;
  name: string;
  /** Image thumbnail, or a palette name to paint one from. */
  thumb?: string;
  palette?: string;
  /** Short right-hand meta, e.g. "9.1" or "Oct". */
  meta?: string;
  /** Highlighted badge value next to meta. */
  badge?: string;
  note?: string;
  /** ISO-ish date used to group cards by month. */
  date: string;
  href?: string;
};

export type Block = {
  cmd: string;
  out?: Out[];
  /** The command ends in a link (e.g. `open github.com/...`). */
  link?: { text: string; href: string };
  calendar?: { days: Day[]; done: string; top: Record<string, { repo: string; commits: number }[]> };
  viewer?: true;
  archive?: { kind: "themes" | "cards"; cards: ArchiveCard[]; groupBy?: "month" | "group" };
};

export type Spec = {
  cwd: string;
  branch: string | null;
  head?: Out[];
  hero?: "blueprint";
  shots?: Shot[];
  blocks: Block[];
};

export type Tile = "about" | "stack" | "themes" | "findings" | "career" | "honors" | "writing";

export type Entry = {
  id: string;
  label: string;
  kind: "about" | "project" | "findings" | "career" | "honors" | "writing" | "stack" | "themes";
  /** Painted wheel tile (else `src`). */
  tile?: Tile;
  src?: string;
  winbar: string;
  tab: string;
  bar: [label: string, value: string][];
  spec: Spec;
  /** Plain text the eye and the worm read from. */
  text: string;
  /** A page with the long version. */
  href?: string;
};

export type Blueprint = { points: number; from: string; to: string; owner: string };

export type EditorData = {
  owner: string;
  handle: string;
  entries: Entry[];
  days: Day[];
  blueprint: Blueprint;
  /** Icons for the stack tile. */
  icons: Icon[];
  visitors: { total: number | null; days: number[]; since: string | null };
};
