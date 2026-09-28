import Link from "next/link";
import { ArrowUpRight } from "@phosphor-icons/react/dist/ssr";
import { Container } from "@/components/container";
import { ContributionGrid } from "@/components/landing/contribution-grid";
import { SectionHeading } from "@/components/section-heading";
import { siteConfig } from "@/config/meta";
import {
  getGitHubContributions,
  groupContributionsByWeek,
  type ContributionDay,
} from "@/lib/github";
import { contributionLevelClasses } from "@/lib/github-levels";
import { cn } from "@/lib/utils";

function getMonthLabels(weeks: ContributionDay[][]) {
  const labels: { month: string; weekIndex: number }[] = [];
  let lastMonth = "";

  weeks.forEach((week, weekIndex) => {
    const firstDay = week.find((day) => day.date);
    if (!firstDay) return;

    const month = new Date(firstDay.date).toLocaleString("en", { month: "short", timeZone: "UTC" });
    if (month === lastMonth) return;

    const lastIndex = labels[labels.length - 1]?.weekIndex ?? -4;
    if (weekIndex - lastIndex < 3) return;

    labels.push({ month, weekIndex });
    lastMonth = month;
  });

  return labels;
}

function getStats(days: ContributionDay[]) {
  let longest = 0;
  let run = 0;
  let best = days[0];

  for (const day of days) {
    run = day.count > 0 ? run + 1 : 0;
    longest = Math.max(longest, run);
    if (!best || day.count > best.count) best = day;
  }

  // Current streak counts back from today; an empty today doesn't break it yet.
  let i = days.length - 1;
  if (days[i]?.count === 0) i--;
  let current = 0;
  while (i >= 0 && days[i]!.count > 0) {
    current++;
    i--;
  }

  return { longest, current, best };
}

const formatDay = (date: string) =>
  new Date(`${date}T00:00:00Z`).toLocaleDateString("en", {
    month: "short",
    day: "numeric",
    timeZone: "UTC",
  });

export async function GitHubContributions() {
  const data = await getGitHubContributions(siteConfig.githubUsername);

  if (!data) return null;

  const days = data.contributions.filter((day) => day.date);
  const weeks = groupContributionsByWeek(data.contributions);
  const monthLabels = getMonthLabels(weeks);
  const total = data.total.lastYear;
  const { longest, current, best } = getStats(days);

  const stats = [
    { label: "Contributions", value: total.toLocaleString("en"), unit: "past year" },
    { label: "Longest streak", value: String(longest), unit: longest === 1 ? "day" : "days" },
    { label: "Current streak", value: String(current), unit: current === 1 ? "day" : "days" },
    ...(best && best.count > 0
      ? [{ label: "Best day", value: String(best.count), unit: `on ${formatDay(best.date)}` }]
      : []),
  ];

  return (
    <Container>
      <div className="mb-5 flex items-center justify-between gap-4">
        <SectionHeading title="GitHub Activity" uppercase className="mb-0" />
        <Link
          href={`https://github.com/${siteConfig.githubUsername}`}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex shrink-0 items-center gap-1 font-mono text-xs uppercase tracking-[0.15em] text-secondary transition-colors hover:text-foreground"
        >
          @{siteConfig.githubUsername}
          <ArrowUpRight className="size-3.5" />
        </Link>
      </div>

      <div className="animate-in-up-on-view rounded-2xl border border-border bg-card/60 p-4 sm:p-5">
        <dl className="mb-5 grid grid-cols-2 gap-4 sm:grid-cols-4">
          {stats.map((stat) => (
            <div key={stat.label}>
              <dt className="font-mono text-[10px] uppercase tracking-[0.15em] text-secondary">
                {stat.label}
              </dt>
              <dd className="mt-1 flex items-baseline gap-1.5">
                <span className="font-display text-2xl font-medium tracking-tight">
                  {stat.value}
                </span>
                <span className="text-xs text-secondary">{stat.unit}</span>
              </dd>
            </div>
          ))}
        </dl>

        <ContributionGrid
          weeks={weeks}
          monthLabels={monthLabels}
          label={`${total} GitHub contributions in the past year`}
        />

        <div className="mt-4 flex items-center justify-end gap-1.5 text-[10px] font-medium uppercase tracking-wider text-secondary">
          <span>Less</span>
          {contributionLevelClasses.map((color, i) => (
            <div key={i} className={cn("size-2.5 rounded-[3px]", color)} />
          ))}
          <span>More</span>
        </div>
      </div>
    </Container>
  );
}
