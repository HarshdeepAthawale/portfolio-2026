import { siteConfig } from "@/config/meta";

export type RepoStats = {
  name: string;
  url: string;
  description: string | null;
  language: string | null;
  license: string | null;
  stars: number;
  forks: number;
  watchers: number;
  commits: number | null;
  files: number | null;
  sizeKb: number;
  created: string;
  pushed: string;
  branch: string;
};

export type Profile = {
  followers: number;
  repos: number;
  stars: number;
  /** Primary language of each owned, non-fork repo, most common first. */
  languages: { name: string; repos: number }[];
};

const API = "https://api.github.com";
const owner = () => siteConfig.githubUsername;

const headers = () => ({
  Accept: "application/vnd.github+json",
  "X-GitHub-Api-Version": "2022-11-28",
  // Optional: lifts the 60/hour anonymous limit at build time.
  ...(process.env.GITHUB_TOKEN ? { Authorization: `Bearer ${process.env.GITHUB_TOKEN}` } : {}),
});

const get = (path: string) => fetch(`${API}${path}`, { headers: headers(), next: { revalidate: 3600 } });

/** Commit count on the default branch, from the last page of a 1-per-page listing. */
async function commitCount(repo: string, branch: string) {
  const res = await get(`/repos/${owner()}/${repo}/commits?sha=${branch}&per_page=1`);
  if (!res.ok) return null;
  const last = res.headers.get("link")?.match(/[?&]page=(\d+)>; rel="last"/);
  if (last) return Number(last[1]);
  const body = (await res.json()) as unknown[];
  return body.length;
}

async function fileCount(repo: string, branch: string) {
  const res = await get(`/repos/${owner()}/${repo}/git/trees/${branch}?recursive=1`);
  if (!res.ok) return null;
  const body = (await res.json()) as { tree?: { type: string }[] };
  return body.tree ? body.tree.filter((node) => node.type === "blob").length : null;
}

/** Live stats for one of the owner's repos, or null if GitHub can't be reached. */
export async function getRepoStats(repo: string): Promise<RepoStats | null> {
  try {
    const res = await get(`/repos/${owner()}/${repo}`);
    if (!res.ok) return null;
    const r = (await res.json()) as {
      name: string;
      html_url: string;
      description: string | null;
      language: string | null;
      license: { spdx_id: string } | null;
      stargazers_count: number;
      forks_count: number;
      subscribers_count: number;
      size: number;
      created_at: string;
      pushed_at: string;
      default_branch: string;
    };
    const [commits, files] = await Promise.all([commitCount(repo, r.default_branch), fileCount(repo, r.default_branch)]);
    return {
      name: r.name,
      url: r.html_url,
      description: r.description,
      language: r.language,
      license: r.license && r.license.spdx_id !== "NOASSERTION" ? r.license.spdx_id : null,
      stars: r.stargazers_count,
      forks: r.forks_count,
      watchers: r.subscribers_count,
      commits,
      files,
      sizeKb: r.size,
      created: r.created_at.slice(0, 10),
      pushed: r.pushed_at.slice(0, 10),
      branch: r.default_branch,
    };
  } catch {
    return null;
  }
}

/** Followers, stars and languages across the owner's public repos. */
export async function getProfile(): Promise<Profile | null> {
  try {
    const [userRes, reposRes] = await Promise.all([get(`/users/${owner()}`), get(`/users/${owner()}/repos?per_page=100&type=owner`)]);
    if (!userRes.ok || !reposRes.ok) return null;
    const user = (await userRes.json()) as { followers: number; public_repos: number };
    const repos = (await reposRes.json()) as { fork: boolean; stargazers_count: number; language: string | null }[];
    const own = repos.filter((repo) => !repo.fork);
    const counts = new Map<string, number>();
    for (const repo of own) if (repo.language) counts.set(repo.language, (counts.get(repo.language) ?? 0) + 1);
    return {
      followers: user.followers,
      repos: user.public_repos,
      stars: own.reduce((sum, repo) => sum + repo.stargazers_count, 0),
      languages: [...counts].map(([name, n]) => ({ name, repos: n })).sort((a, b) => b.repos - a.repos),
    };
  } catch {
    return null;
  }
}

/**
 * The repos the owner committed to most, per month (needs GITHUB_TOKEN; the
 * GraphQL API has no anonymous access). Keys are "YYYY-MM".
 */
export async function getMonthlyTopRepos(months: string[]): Promise<Record<string, { repo: string; commits: number }[]>> {
  if (!process.env.GITHUB_TOKEN || !months.length) return {};
  const fields = months
    .map((month, k) => {
      const [y, m] = month.split("-").map(Number) as [number, number];
      const from = new Date(Date.UTC(y, m - 1, 1)).toISOString();
      const to = new Date(Date.UTC(y, m, 1) - 1000).toISOString();
      return `m${k}: contributionsCollection(from: "${from}", to: "${to}") { commitContributionsByRepository(maxRepositories: 3) { repository { name isPrivate } contributions { totalCount } } }`;
    })
    .join("\n");
  try {
    const res = await fetch(`${API}/graphql`, {
      method: "POST",
      headers: { ...headers(), "Content-Type": "application/json" },
      body: JSON.stringify({ query: `query { user(login: "${owner()}") { ${fields} } }` }),
      next: { revalidate: 3600 },
    });
    if (!res.ok) return {};
    type Repo = { repository: { name: string; isPrivate: boolean }; contributions: { totalCount: number } };
    const body = (await res.json()) as { data?: { user?: Record<string, { commitContributionsByRepository: Repo[] }> } };
    const user = body.data?.user;
    if (!user) return {};
    return Object.fromEntries(
      months.map((month, k) => [
        month,
        (user[`m${k}`]?.commitContributionsByRepository ?? [])
          .filter((item) => !item.repository.isPrivate)
          .map((item) => ({ repo: item.repository.name, commits: item.contributions.totalCount })),
      ]),
    );
  } catch {
    return {};
  }
}
