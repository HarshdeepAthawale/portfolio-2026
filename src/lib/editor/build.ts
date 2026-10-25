import "server-only";
import * as simpleIcons from "simple-icons";
import { aboutConfig } from "@/config/about";
import { achievements } from "@/config/achievements";
import { education } from "@/config/education";
import { experience } from "@/config/experience";
import { heroConfig, socialLinks } from "@/config/hero";
import { siteConfig } from "@/config/meta";
import { palettes } from "@/config/palettes";
import { projects } from "@/config/projects";
import { techStack } from "@/config/tech-stack";
import { getAnalytics } from "@/lib/analytics";
import { getGitHubContributions, relevelContributions } from "@/lib/github";
import { getMonthlyTopRepos, getProfile, getRepoStats } from "@/lib/github-repo";
import { getBlogPosts } from "@/lib/mdx";
import { techIconMap } from "@/lib/tech-icons";
import { getVisitorCount } from "@/lib/visitor-store";
import type { ArchiveCard, Block, Day, EditorData, Entry, Icon, Out, Seg } from "@/lib/editor/types";

const fmt = (n: number) => Math.round(n).toLocaleString("en-US").replace(/,/g, "'");
const pad = (label: string) => label.padEnd(9);
const num = (value: number | string | null | undefined) => (typeof value === "number" ? fmt(value) : (value ?? "0")).padStart(6);
const fact = (label: string, value: number | string | null | undefined, extra: Seg[] = []): Out => ({
  segs: [[pad(label), "t-key"], [num(value), "md-num"], ...extra],
});
const bare = (url: string) => url.replace(/^https?:\/\//, "").replace(/\/$/, "");
const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

/** "Oct" + "2026" -> "2026-10"; "Dec 25 - Present" -> "2025-12"; "Apr 2026" -> "2026-04". */
function monthOf(text: string, year?: string) {
  const m = MONTHS.findIndex((name) => text.startsWith(name));
  if (m < 0) return year ? `${year}-01` : "1970-01";
  const tail = text.slice(3).match(/\b(\d{4}|\d{2})\b/);
  const y = year ?? (tail ? (tail[1]!.length === 2 ? `20${tail[1]}` : tail[1]!) : String(new Date().getFullYear()));
  return `${y}-${String(m + 1).padStart(2, "0")}`;
}

const ICON_ALIASES: Record<string, string> = {
  "Jupyter Notebook": "jupyter",
  HTML: "html5",
  Shell: "gnubash",
  "C#": "dotnet",
  Dockerfile: "docker",
  Go: "go",
  Rust: "rust",
  Java: "openjdk",
  Kotlin: "kotlin",
  Dart: "dart",
  Swift: "swift",
  Ruby: "ruby",
  PHP: "php",
  Lua: "lua",
  Vue: "vuedotjs",
  Svelte: "svelte",
  "Upstash Redis": "upstash",
  Cloudflare: "cloudflare",
  "Tailwind v4": "tailwindcss",
  "Next.js 15": "nextdotjs",
  "IBM Plex Mono": "ibm",
};

/** A simple-icons glyph for a tool or language name, if one exists. */
function iconFor(name: string): Icon | null {
  const slug = ICON_ALIASES[name] ?? techIconMap[name] ?? name.toLowerCase().replace(/\+/g, "plus").replace(/\./g, "dot").replace(/[^a-z0-9]/g, "");
  if (slug.startsWith("/")) return null;
  const key = `si${slug.charAt(0).toUpperCase()}${slug.slice(1)}` as keyof typeof simpleIcons;
  const icon = simpleIcons[key] as { path: string; title: string } | undefined;
  return icon?.path ? { path: icon.path, box: 24, title: icon.title } : null;
}

const glyph = (name: string): Seg => ({ icon: iconFor(name), letter: name });

/** A share gauge plus its trailing note, e.g. "███░░░  34% of all stars". */
function gauge(share: number, note: string, used: number): Seg[] {
  return ["  ", { gauge: share, used: used + note.length }, ...(note ? [[note, "t-dim"] as Seg] : [])];
}

async function contributions() {
  const data = await getGitHubContributions(siteConfig.githubUsername);
  if (!data) return null;
  const { days } = relevelContributions(data.contributions);
  const all = days.filter((day) => day.date) as Day[];
  const year = String(new Date().getFullYear());
  const thisYear = all.filter((day) => day.date.startsWith(year));
  const months = [...new Set(thisYear.map((day) => day.date.slice(0, 7)))];
  return {
    all,
    year: thisYear.length >= 28 ? thisYear : all,
    total: (thisYear.length >= 28 ? thisYear : all).reduce((sum, day) => sum + day.count, 0),
    months,
  };
}

async function visitors() {
  const [total, report] = await Promise.all([getVisitorCount().catch(() => null), getAnalytics(56).catch(() => null)]);
  const days = report ? report.days : [];
  const first = days.findIndex((day) => day.visitors > 0 || day.pageviews > 0);
  return {
    total,
    days: days.map((day, k) => (first < 0 || k < first ? -1 : day.visitors)),
    since: first >= 0 ? days[first]!.day : null,
  };
}

const PROGRAMS = ["Red Bull", "Netflix", "Goldman Sachs", "Adobe", "NVIDIA", "Anduril", "Flipkart", "Coca-Cola", "Superdrug"];

export async function buildEditorData(): Promise<EditorData> {
  const handle = siteConfig.githubUsername;
  const [cal, posts, profile, repoStats, visitorData] = await Promise.all([
    contributions(),
    getBlogPosts(),
    getProfile(),
    Promise.all(projects.map((p) => (p.repo ? getRepoStats(p.repo) : Promise.resolve(null)))),
    visitors(),
  ]);
  const top = cal ? await getMonthlyTopRepos(cal.months) : {};
  const totalStars = profile?.stars ?? repoStats.reduce((sum, r) => sum + (r?.stars ?? 0), 0);
  const starShare = (stars: number) => {
    if (!totalStars) return { share: 0, note: "" };
    const share = Math.round((stars / totalStars) * 100);
    return { share: (share || (stars ? 0.5 : 0)) / 100, note: `  ${share || (stars ? "<1" : 0)}% of all stars` };
  };

  const calendarBlock = (): Block[] =>
    cal
      ? [
          {
            cmd: `node calendar.mjs ${cal.year[0]!.date.slice(0, 4)}`,
            calendar: {
              days: cal.year,
              top,
              done: `// done · ${new Set(cal.year.map((day) => day.date.slice(0, 7))).size} months · ${fmt(cal.total)} contributions`,
            },
          },
        ]
      : [];

  // ------------------------------------------------------------------ whoami
  const links = [
    ...socialLinks.map((link) => ({ name: link.name.toLowerCase(), href: link.href })),
    { name: "resume", href: "/resume" },
    { name: "mail", href: `mailto:${heroConfig.email}` },
  ];
  const bio = [
    "Security researcher and engineer. I break web and mobile apps,",
    "write the report a stranger can reproduce, then build the defense.",
    `${aboutConfig.meta.find((m) => m.label === "Education")?.value ?? ""} · ${heroConfig.location} · ${heroConfig.availability.toLowerCase()}.`,
  ];
  const from = cal?.year[0]?.date ?? "";
  const to = cal?.year[cal.year.length - 1]?.date ?? "";
  const whoami: Entry = {
    id: "about",
    label: "whoami",
    kind: "about",
    tile: "about",
    src: "/assets/whoami-card.jpg",
    winbar: `fish — ~ · ${handle}`,
    tab: "/",
    href: "/about",
    bar: [
      ["REPORTS", "35+"],
      ["TOP CVSS", "9.1"],
      ["CONTRIBS", fmt(cal?.total ?? 0)],
    ],
    text: [heroConfig.bio, aboutConfig.intro.replace(/\*\*/g, ""), aboutConfig.quote].join(" "),
    spec: {
      cwd: "~",
      branch: null,
      hero: "blueprint",
      blocks: [
        { cmd: "whoami", out: bio.map((line) => ({ segs: [line], cls: "t-dim" })) },
        {
          cmd: `fetch ${handle}`,
          out: [
            fact("reports", "35+", [["  hackerone · intigriti", "t-dim"]]),
            fact("programs", PROGRAMS.length, [[`  ${PROGRAMS.slice(0, 4).join(" · ").toLowerCase()} …`, "t-dim"]]),
            ...(profile ? [fact("repos", profile.repos), fact("stars", profile.stars), fact("followers", profile.followers)] : []),
            ...(cal ? [fact("contribs", cal.total, [[`  ${from} → ${to}`, "t-dim"]])] : []),
          ],
        },
        { cmd: "ls links/", out: [{ segs: links.flatMap((link, k): Seg[] => [...(k ? ["   "] : []), [link.name, "", link.href]]) }] },
      ],
    },
  };

  // ---------------------------------------------------------------- projects
  const projectEntries = projects.map((p, i): Entry => {
    const r = repoStats[i];
    const repo = p.repo ?? p.slug;
    const { share, note } = starShare(r?.stars ?? 0);
    const url = r?.url ?? p.href;
    const shots = [p.cover, p.cover?.replace(/-cover\.png$/, ".jpg")]
      .filter((file, k, list): file is string => Boolean(file) && list.indexOf(file) === k)
      .map((file, k) => ({ file, name: file.split("/").pop()!, alt: `${p.title} screenshot ${k + 1}` }));
    return {
      id: p.slug,
      label: p.slug,
      kind: "project",
      src: p.cover,
      winbar: `fish — ~/Projects/${p.slug}`,
      tab: `/${p.slug}`,
      href: `/projects/${p.slug}`,
      bar: [
        ["STARS", fmt(r?.stars ?? 0)],
        ["FORKS", fmt(r?.forks ?? 0)],
        ["COMMITS", r?.commits != null ? fmt(r.commits) : "-"],
      ],
      text: [p.title, p.description, p.tech.join(" ")].join(" "),
      spec: {
        cwd: `~/P/${p.slug}`,
        branch: r?.branch ?? "main",
        shots,
        blocks: [
          {
            cmd: `fetch ${p.slug}`,
            out: [
              { segs: [[p.title, "md-h md-h1"]] },
              { segs: [r?.description || p.description.split(". ")[0]!], cls: "t-dim" },
              { segs: [" "] },
              fact("stars", r?.stars ?? 0, gauge(share, note, 17)),
              fact("forks", r?.forks ?? 0),
              fact("watch", r?.watchers ?? 0),
              fact("commits", r?.commits ?? null),
              ...(r?.files != null ? [fact("files", r.files)] : []),
              { segs: [[pad("lang"), "t-key"], [r?.language ?? p.tech[0] ?? "—", "md-code"], ...(r?.license ? [[`  ${r.license}`, "t-dim"] as Seg] : [])] },
              { segs: [[pad("stack"), "t-key"], ...p.tech.flatMap((t, k): Seg[] => [...(k ? [["  ", ""] as Seg] : []), glyph(t), ` ${t}`])], cls: "t-hang" },
              ...(r ? [{ segs: [[pad("since"), "t-key"], r.created, ["  pushed ", "t-dim"], r.pushed] as Seg[] }] : [{ segs: [[pad("date"), "t-key"], p.date] as Seg[] }]),
            ],
          },
          ...(shots.length ? [{ cmd: "ls shots/", viewer: true as const }] : []),
          { cmd: `open ${bare(url)}`, link: { text: bare(url), href: url } },
        ],
      },
    };
  });

  // ---------------------------------------------------------------- findings
  const findings = aboutConfig.findings.items;
  const scoreOf = (severity: string) => Number(severity.match(/(\d+(?:\.\d+)?)/)?.[1] ?? NaN);
  const findingsEntry: Entry = {
    id: "findings",
    label: "findings/",
    kind: "findings",
    tile: "findings",
    winbar: `findings/ — ${findings.length} disclosed · 35+ reported`,
    tab: "/findings/",
    href: "/about",
    bar: [
      ["REPORTS", "35+"],
      ["PROGRAMS", String(PROGRAMS.length)],
      ["TOP CVSS", "9.1"],
    ],
    text: findings.map((f) => `${f.org} ${f.severity} ${f.text}`).join(" "),
    spec: {
      cwd: "~/findings",
      branch: null,
      blocks: [
        {
          cmd: "fetch findings/",
          out: [
            fact("reports", "35+", [["  hackerone · intigriti", "t-dim"]]),
            fact("programs", PROGRAMS.length),
            fact("critical", findings.filter((f) => f.tier === "critical").length),
            fact("high", findings.filter((f) => f.tier === "high").length),
          ],
        },
        {
          cmd: "cvss --sort findings/*.md",
          out: findings.flatMap((f): Out[] => {
            const score = scoreOf(f.severity);
            const head: Seg[] = Number.isFinite(score)
              ? [[f.org.padEnd(18), "md-code"], [score.toFixed(1).padStart(4), "md-num"], "  ", { gauge: score / 10, used: 24 + 10 }, ["  cvss", "t-dim"]]
              : [[f.org.padEnd(18), "md-code"], [f.severity, "t-git"]];
            return [{ segs: head }, { segs: [["  └ ", "t-dim"], [f.text, "t-dim"]], cls: "t-hang2" }];
          }),
        },
        { cmd: "grep -i lesson notes.md", out: [{ segs: [[`"${aboutConfig.quote}"`, "md-quote"]] }] },
        { cmd: "open /about", link: { text: "/about", href: "/about" } },
      ],
    },
  };

  // ------------------------------------------------------------------ career
  const careerCards: ArchiveCard[] = experience.flatMap((e) => {
    const roles = e.roles?.length ? e.roles : [{ title: e.role ?? "", periodShort: e.periodShort, working: e.working, photos: e.photos }];
    return roles.map((role, k) => ({
      id: `${e.company}-${k}`,
      name: e.company,
      thumb: role.photos?.[0]?.src ?? e.photos?.[0]?.src ?? e.logo,
      meta: role.periodShort.replace(/ - /, "→"),
      note: role.title,
      badge: role.working ? "now" : undefined,
      date: monthOf(role.periodShort),
      href: "/work",
    }));
  });
  const careerEntry: Entry = {
    id: "career",
    label: "career/",
    kind: "career",
    tile: "career",
    src: experience[0]?.logo,
    winbar: `career/ — ${careerCards.length} roles · ${experience.filter((e) => e.working).length} current`,
    tab: "/career/",
    href: "/work",
    bar: [
      ["ROLES", String(careerCards.length)],
      ["CURRENT", String(careerCards.filter((c) => c.badge).length)],
    ],
    text: experience.flatMap((e) => [e.company, e.role ?? "", ...(e.details ?? []), ...(e.roles ?? []).flatMap((r) => [r.title, ...(r.details ?? [])])]).join(" "),
    spec: {
      cwd: "~/career",
      branch: null,
      blocks: [
        {
          cmd: "fetch career/",
          out: [
            fact("roles", careerCards.length),
            fact("current", careerCards.filter((c) => c.badge).length),
            ...(education[0] ? [{ segs: [[pad("school"), "t-key"], [education[0].school, "md-code"], [`  ${education[0].period}`, "t-dim"]] as Seg[] }] : []),
          ],
        },
        { cmd: "git log --graph career/", archive: { kind: "cards", cards: careerCards } },
      ],
    },
  };

  // ------------------------------------------------------------------ honors
  const honorCards: ArchiveCard[] = achievements.map((a) => ({
    id: a.slug,
    name: a.title,
    thumb: a.image,
    meta: a.organization,
    date: monthOf(a.periodShort, a.year),
    href: `/achievements/${a.slug}`,
  }));
  const wins = achievements.filter((a) => /winner|1st|runner|award/i.test(a.title)).length;
  const honorsEntry: Entry = {
    id: "honors",
    label: "honors/",
    kind: "honors",
    tile: "honors",
    src: achievements[0]?.image,
    winbar: `honors/ — ${achievements.length} honors · ${wins} wins`,
    tab: "/honors/",
    href: "/achievements",
    bar: [
      ["HONORS", String(achievements.length)],
      ["WINS", String(wins)],
    ],
    text: achievements.flatMap((a) => [a.title, a.organization, ...(a.details ?? [])]).join(" "),
    spec: {
      cwd: "~/honors",
      branch: null,
      blocks: [
        { cmd: "fetch honors/", out: [fact("honors", achievements.length), fact("wins", wins)] },
        { cmd: "git log --graph honors/", archive: { kind: "cards", cards: honorCards } },
      ],
    },
  };

  // ----------------------------------------------------------------- writing
  const medium = socialLinks.find((link) => link.icon === "medium")?.href;
  const writingEntry: Entry = {
    id: "writing",
    label: "writing/",
    kind: "writing",
    tile: "writing",
    winbar: `writing/ — ${posts.length} posts`,
    tab: "/writing/",
    href: "/blog",
    bar: [["POSTS", String(posts.length)]],
    text: posts.map((p) => `${p.title} ${p.description}`).join(" "),
    spec: {
      cwd: "~/writing",
      branch: null,
      blocks: [
        {
          cmd: "ls -lt writing/",
          out: posts.flatMap((p): Out[] => [
            { segs: [[p.date.padEnd(10), "t-dim"], [p.title, "", `/blog/${p.slug}`]] },
            ...(p.description ? [{ segs: [["          "], [p.description, "t-dim"]], cls: "t-hang3" } as Out] : []),
          ]),
        },
        ...(medium ? [{ cmd: `open ${bare(medium)}`, link: { text: bare(medium), href: medium } }] : []),
      ],
    },
  };

  // ------------------------------------------------------------------- stack
  const langs = profile?.languages.slice(0, 6) ?? [];
  const langRepos = langs.reduce((sum, l) => sum + l.repos, 0);
  const unit = (n: number) => ` repo${n === 1 ? "" : "s"}`;
  const langUsed = Math.max(0, ...langs.map((l) => 3 + Math.max(11, l.name.length) + 4 + unit(l.repos).length));
  const site = [
    ["Next.js 15", "package.json"],
    ["React", "package.json"],
    ["Tailwind v4", "globals.css"],
    ["TypeScript", "tsconfig.json"],
    ["Upstash Redis", "analytics"],
    ["Vercel", "vercel.json"],
  ] as const;
  const cols = 3;
  const toolRows: Out[] = [];
  for (let k = 0; k < techStack.length; k += cols) {
    toolRows.push({
      segs: techStack.slice(k, k + cols).flatMap((tool, j): Seg[] => [...(j ? ["  "] : []), glyph(tool.name), " ", [tool.name.padEnd(12)]]),
    });
  }
  const icons = [...langs.map((l) => iconFor(l.name)), ...techStack.map((t) => iconFor(t.name)), ...site.map(([name]) => iconFor(name))].filter(
    (icon, k, list): icon is Icon => Boolean(icon) && list.findIndex((other) => other?.path === icon!.path) === k,
  );
  const stackEntry: Entry = {
    id: "stack",
    label: "stack/",
    kind: "stack",
    tile: "stack",
    winbar: "fish — ~ · stack",
    tab: "/stack/",
    bar: [
      ["LANGS", String(langs.length)],
      ["TOOLS", String(techStack.length)],
      ["CONTRIBS", fmt(cal?.total ?? 0)],
    ],
    text: [...langs.map((l) => l.name), ...techStack.map((t) => t.name), ...site.map(([name]) => name)].join(" "),
    spec: {
      cwd: "~",
      branch: null,
      blocks: [
        ...(langs.length
          ? [
              {
                cmd: "stack --languages",
                out: langs.map((l) => ({
                  segs: [glyph(l.name), " ", [l.name.padEnd(11), "md-code"], { gauge: l.repos / langRepos, used: langUsed }, [String(l.repos).padStart(4), "md-num"], [unit(l.repos), "t-dim"]] as Seg[],
                })),
              },
            ]
          : []),
        { cmd: "stack --tools", out: [...toolRows, { segs: ["what the work actually runs on"], cls: "t-dim" }] },
        { cmd: "stack --site", out: site.map(([name, via]) => ({ segs: [glyph(name), " ", [name.padEnd(20)], [via, "t-dim"]] as Seg[] })) },
        ...calendarBlock(),
      ],
    },
  };

  // ------------------------------------------------------------------ themes
  const dark = palettes.filter((p) => !p.light);
  const themesEntry: Entry = {
    id: "themes",
    label: "themes/",
    kind: "themes",
    tile: "themes",
    winbar: `themes/ — ${palettes.length} schemes · ${dark.length} dark · ${palettes.length - dark.length} light`,
    tab: "/themes/",
    bar: [
      ["THEMES", String(palettes.length)],
      ["DARK", String(dark.length)],
      ["LIGHT", String(palettes.length - dark.length)],
    ],
    text: palettes.map((p) => p.name).join(" "),
    spec: {
      cwd: "~/themes",
      branch: null,
      blocks: [
        {
          cmd: "fetch themes/",
          out: [
            fact("themes", palettes.length),
            fact("dark", dark.length),
            fact("light", palettes.length - dark.length),
            { segs: [[pad("credit"), "t-key"], ["HANCORE-linux", "", "https://github.com/HANCORE-linux"], ["  first twelve · MIT", "t-dim"]] },
          ],
        },
        {
          cmd: "git log --graph themes/",
          archive: {
            kind: "themes",
            groupBy: "group",
            cards: palettes.map((p) => ({ id: p.name, name: p.name, palette: p.name, date: p.light ? "light/" : "dark/" })),
          },
        },
      ],
    },
  };

  return {
    owner: heroConfig.name,
    handle,
    entries: [whoami, ...projectEntries, findingsEntry, careerEntry, honorsEntry, writingEntry, stackEntry, themesEntry],
    days: cal?.all ?? [],
    blueprint: { points: cal?.total ?? 0, from, to, owner: handle },
    icons,
    visitors: visitorData,
  };
}
