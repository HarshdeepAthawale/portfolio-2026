import { siteConfig } from "@/config/meta";

export type RepoStats = {
  name: string;
  url: string;
  description: string | null;
  language: string | null;
  stars: number;
  forks: number;
  commits: number | null;
  sizeKb: number;
  created: string;
  pushed: string;
  branch: string;
};

const headers = () => ({
  Accept: "application/vnd.github+json",
  "X-GitHub-Api-Version": "2022-11-28",
  // Optional: lifts the 60/hour anonymous limit at build time.
  ...(process.env.GITHUB_TOKEN ? { Authorization: `Bearer ${process.env.GITHUB_TOKEN}` } : {}),
});

/** Commit count on the default branch, from the last page of a 1-per-page listing. */
async function commitCount(repo: string, branch: string) {
  const res = await fetch(
    `https://api.github.com/repos/${siteConfig.githubUsername}/${repo}/commits?sha=${branch}&per_page=1`,
    { headers: headers(), next: { revalidate: 3600 } },
  );
  if (!res.ok) return null;
  const last = res.headers.get("link")?.match(/[?&]page=(\d+)>; rel="last"/);
  if (last) return Number(last[1]);
  const body = (await res.json()) as unknown[];
  return body.length;
}

/** Live stats for one of the owner's repos, or null if GitHub can't be reached. */
export async function getRepoStats(repo: string): Promise<RepoStats | null> {
  try {
    const res = await fetch(`https://api.github.com/repos/${siteConfig.githubUsername}/${repo}`, {
      headers: headers(),
      next: { revalidate: 3600 },
    });
    if (!res.ok) return null;
    const r = (await res.json()) as {
      name: string;
      html_url: string;
      description: string | null;
      language: string | null;
      stargazers_count: number;
      forks_count: number;
      size: number;
      created_at: string;
      pushed_at: string;
      default_branch: string;
    };
    return {
      name: r.name,
      url: r.html_url,
      description: r.description,
      language: r.language,
      stars: r.stargazers_count,
      forks: r.forks_count,
      commits: await commitCount(repo, r.default_branch),
      sizeKb: r.size,
      created: r.created_at.slice(0, 10),
      pushed: r.pushed_at.slice(0, 10),
      branch: r.default_branch,
    };
  } catch {
    return null;
  }
}
