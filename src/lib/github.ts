export type ContributionDay = {
  date: string;
  count: number;
  level: number;
};

export type GitHubContributions = {
  total: { lastYear: number };
  contributions: ContributionDay[];
};

export async function getGitHubContributions(
  username: string,
): Promise<GitHubContributions | null> {
  try {
    const res = await fetch(
      `https://github-contributions-api.jogruber.de/v4/${username}?y=last`,
      { next: { revalidate: 3600 } },
    );
    if (!res.ok) return null;
    return res.json();
  } catch {
    return null;
  }
}

/**
 * Re-levels days by quartiles of *your* active days. GitHub scales levels to the
 * single busiest day, so one huge day flattens everything else into level 1.
 * Returns the days plus the upper bound of each level (for the legend).
 */
export function relevelContributions(contributions: ContributionDay[]) {
  const active = contributions
    .filter((day) => day.date && day.count > 0)
    .map((day) => day.count)
    .sort((a, b) => a - b);
  const quantile = (q: number) => active[Math.min(active.length - 1, Math.floor(q * active.length))] ?? 0;
  const bounds = [quantile(0.25), quantile(0.5), quantile(0.75)];

  const days = contributions.map((day) => {
    if (!day.date) return day;
    if (day.count === 0) return { ...day, level: 0 };
    const level = day.count <= bounds[0] ? 1 : day.count <= bounds[1] ? 2 : day.count <= bounds[2] ? 3 : 4;
    return { ...day, level };
  });

  // Human-readable range per level, e.g. ["0", "1-2", "3-5", "6-9", "10+"].
  const ranges = ["0"];
  let from = 1;
  for (const bound of bounds) {
    ranges.push(bound <= from ? String(from) : `${from}-${bound}`);
    from = Math.max(from, bound + 1);
  }
  ranges.push(`${from}+`);
  return { days, ranges };
}

export function groupContributionsByWeek(contributions: ContributionDay[]) {
  const weeks: ContributionDay[][] = [];
  let week: ContributionDay[] = [];

  contributions.forEach((day, index) => {
    if (index === 0) {
      const pad = new Date(day.date).getDay();
      for (let i = 0; i < pad; i++) {
        week.push({ date: "", count: 0, level: -1 });
      }
    }

    week.push(day);

    if (week.length === 7) {
      weeks.push(week);
      week = [];
    }
  });

  if (week.length) weeks.push(week);
  return weeks;
}
