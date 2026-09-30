# Harshdeep Athawale — Portfolio

Personal portfolio for a security engineer and offensive security researcher. Built with Next.js 15, TypeScript, Tailwind CSS v4, and MDX — clean layout, fast pages, and content you can edit without touching UI code.


---

## Highlights

- **Home** — hero, tech stack, experience, achievements, featured projects, GitHub contributions, quote & visitor card
- **About** — narrative story page with highlighted text and connect links
- **Projects** — card grid with cover images, GitHub + live demo links, tech stack icons
- **Achievements** — SIH 2024 & 2025 with photo galleries
- **Blog** — MDX posts with custom covers
- **Books & Favourites** — curated lists with hover cards
- **Resume** — embedded PDF viewer with download link
- **Command palette** — search any page with `⌘K` / `Ctrl+K`
- **Theme toggle** — light / dark mode
- **Mowgli** — animated cursor pet in the navbar
- **Admin** — `/admin` CMS for posts, site content, images and the resume, plus real-time visitor analytics

---

## Tech Stack

| Layer | Tools |
|-------|-------|
| Framework | [Next.js 15](https://nextjs.org/) (App Router) |
| Language | TypeScript |
| Styling | Tailwind CSS v4 |
| Content | MDX (`gray-matter`, `next-mdx-remote`) |
| Icons | [Phosphor Icons](https://phosphoricons.com/) |
| UI | Radix UI, cmdk |
| Theme | next-themes |

---

## Getting Started

**Requirements:** Node.js 18+

```bash
git clone https://github.com/HarshdeepAthawale/portfolio-2026.git
cd portfolio-2026
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

### Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start development server |
| `npm run build` | Production build |
| `npm start` | Run production server |
| `npm run lint` | Run ESLint |

---

## Project Structure

```
portfolio-2026/
├── src/
│   ├── app/              # Routes (each folder = a URL)
│   ├── components/       # Reusable UI + landing sections
│   ├── config/           # Content & site data ← edit these most
│   └── lib/              # MDX, GitHub API, tech icons, utils
├── content/
│   ├── blog/             # MDX blog posts
│   ├── projects/         # Optional long-form project writeups
│   └── data/             # Site content as JSON (edited from /admin)
├── public/
│   └── assets/           # Images (covers, photos, avatar)
├── data/
│   └── visitors.json     # Visitor counter storage
└── public/oneko/         # Cursor pet assets
```

### Routes

| Page | Path |
|------|------|
| Home | `/` |
| About | `/about` |
| Projects | `/projects` |
| Work | `/work` |
| Blog | `/blog` |
| Resume | `/resume` |
| Achievements | `/achievements` |
| Books | `/books` |
| Favourites | `/favourites` |

---

## Customizing Content

The easiest way is **`/admin`** (see below). By hand:

| File | What to edit |
|------|--------------|
| `content/data/hero.json` | Name, bio, email, availability, social links, avatar paths |
| `content/data/projects.json` | Projects — title, description, `href` (GitHub), `website` (live demo), cover, tech |
| `content/data/achievements.json` | Hackathon wins, cover image, photo gallery |
| `content/data/experience.json` | Work history, including multi-role companies and photos |
| `content/data/education.json` | Education and skills |
| `src/config/about.ts` | About page story, traits, connect links |
| `src/config/navigation.ts` | Navbar & command menu links |
| `src/config/books.ts` / `favourites.ts` | Books, movies, series |
| `src/config/resume.ts` | Resume PDF paths |
| `src/config/tech-stack.ts` | Home page tech icons |

**Blog posts:** add `.mdx` files to `content/blog/`  
**Project writeups:** add `.mdx` files to `content/projects/` (optional detail pages)

**Images:** place files in `public/assets/` and reference them as `/assets/your-image.png`

### Project links

```ts
{
  slug: "my-project",
  title: "My Project",
  href: "https://github.com/you/repo",       // GitHub (required)
  website: "https://my-app.vercel.app",      // Live demo (optional)
  cover: "/assets/projects/my-project.png",  // Card image (optional)
  tech: ["TypeScript", "Next.js"],
}
```

### Tech stack icons

Icons load from [Simple Icons CDN](https://simpleicons.org/). Add new tech names in `src/lib/tech-icons.ts`.

---

## Profile Images

| File | Purpose |
|------|---------|
| `public/assets/avatar.png` | Default avatar |
| `public/assets/avatar-smile.png` | Hover state |

---

## Visitor Counter

The home page shows a live visitor count via `POST /api/visitors`.

| Environment | Storage |
|-------------|---------|
| **Local dev** | `data/visitors.json` (file on disk) |
| **Vercel / production** | [Upstash Redis](https://upstash.com/) (required) |

Vercel serverless functions have a **read-only filesystem** — writes to `data/visitors.json` are lost on every deploy, which is why the counter shows "Counting visitors..." forever in production.

### Set up Upstash (one-time, ~2 min)

1. Go to [console.upstash.com](https://console.upstash.com) and create a free Redis database
2. Copy **UPSTASH_REDIS_REST_URL** and **UPSTASH_REDIS_REST_TOKEN**
3. In Vercel → your project → **Settings → Environment Variables**, add both
4. Redeploy

Locally, copy `.env.example` to `.env.local` and fill in the same vars (optional — without them, the file store is used).

---

## Admin (`/admin`)

A private CMS built into the site. Every change is a commit to this repo, so git history is the audit log and anything can be reverted; Vercel redeploys on each publish.

- **Posts** — write blog posts and project write-ups in Markdown/MDX with a live preview. Drafts autosave privately to Redis (never to the public repo); publishing refuses MDX that wouldn't build.
- **Content** — forms for the hero, experience, achievements, projects and education.
- **Media** — image uploads, resized to WebP with metadata (including GPS) stripped. Upload-only commits skip the deploy (`vercel.json`) and go live with the next publish.
- **Resume** — upload a PDF; the preview image is rendered in the browser.
- **Analytics** — cookieless, real-time visitor stats: daily visitors and pageviews, live-now count, top pages, referrers, countries, devices and browsers. Only aggregate counts are stored; bots and signed-in admin visits aren't counted.

**Setup**

1. `node scripts/admin-setup.mjs` — asks for your email and password and writes `ADMIN_EMAIL` and `ADMIN_PASSWORD_HASH` (a scrypt hash; the password is never stored) to `.env.local`. Two-factor codes are optional.
2. Create a [fine-grained GitHub token](https://github.com/settings/personal-access-tokens/new) for this repo only (Contents: read/write, Commit statuses: read) and add it as `GITHUB_TOKEN`.
3. `node scripts/set-vercel-env.mjs production`, then redeploy.

Without `GITHUB_TOKEN`, local dev writes changes to the working tree instead of committing.

---

## Deploy

Works on [Vercel](https://vercel.com), Netlify, or any Node.js host.

```bash
npm run build
npm start
```

Set environment variables in `.env.local` if you add external API keys (Spotify, etc.).

---

## License

MIT — feel free to fork and make it yours. A star on GitHub is always appreciated.

---

Built with late nights, coffee, and curiosity.
