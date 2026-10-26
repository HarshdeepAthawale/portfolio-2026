"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type { Contributions, Profile } from "@/lib/github-repo";

export type GitHubStats = { username: string; profile: Profile | null; contributions: Contributions | null };

const number = new Intl.NumberFormat("en-US");
const month = (date: string) => new Date(`${date}T00:00:00Z`).toLocaleDateString("en-US", { month: "short", year: "numeric", timeZone: "UTC" });
const day = (date: string) => new Date(`${date}T00:00:00Z`).toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric", year: "numeric", timeZone: "UTC" });
const plural = (n: number, word: string) => `${number.format(n)} ${word}${n === 1 ? "" : "s"}`;

/** Longest run of consecutive days with at least one contribution, the busiest day and busiest month. */
function records(days: Contributions["days"]) {
  let streak = 0, best = 0;
  let busiest = days[0];
  const months = new Map<string, number>();
  for (const entry of days) {
    streak = entry.count > 0 ? streak + 1 : 0;
    best = Math.max(best, streak);
    if (!busiest || entry.count > busiest.count) busiest = entry;
    months.set(entry.date.slice(0, 7), (months.get(entry.date.slice(0, 7)) ?? 0) + entry.count);
  }
  const [topMonth, topCount] = [...months].sort((a, b) => b[1] - a[1])[0] ?? ["", 0];
  return { best, busiest, topMonth, topCount };
}

type Tab = "general" | "languages" | "records";

export function GitHubStatsDialog({ stats, onClose }: { stats: GitHubStats; onClose: () => void }) {
  const [tab, setTab] = useState<Tab>("general");
  const dialog = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const previous = document.activeElement as HTMLElement | null;
    dialog.current?.querySelector<HTMLElement>("[aria-pressed=true]")?.focus();
    const key = (event: KeyboardEvent) => {
      if (event.key === "Escape") { event.stopImmediatePropagation(); onClose(); }
      if (event.key !== "Tab") return;
      const elements = dialog.current?.querySelectorAll<HTMLElement>("button, a[href]");
      if (!elements?.length) return;
      if (event.shiftKey && document.activeElement === elements[0]) { event.preventDefault(); elements[elements.length - 1].focus(); }
      else if (!event.shiftKey && document.activeElement === elements[elements.length - 1]) { event.preventDefault(); elements[0].focus(); }
    };
    document.addEventListener("keydown", key, true);
    return () => { document.removeEventListener("keydown", key, true); previous?.focus(); };
  }, [onClose]);

  const { profile, contributions } = stats;
  const rows = useMemo(() => {
    const general: [string, string][] = [];
    if (contributions) general.push(["Contributions (last year)", number.format(contributions.total)], ["Commits Mined", number.format(contributions.commits)], ["Pull Requests Opened", number.format(contributions.pullRequests)]);
    if (profile) general.push(["Repositories Crafted", number.format(profile.repos)], ["Stars Collected", number.format(profile.stars)], ["Followers", number.format(profile.followers)], ["Playing Since", month(profile.since)]);
    const languages: [string, string][] = (profile?.languages ?? []).map(lang => [lang.name, plural(lang.repos, "repo")]);
    const record: [string, string][] = [];
    if (contributions?.days.length) {
      const r = records(contributions.days);
      record.push(["Longest Streak", plural(r.best, "day")], ["Busiest Day", `${plural(r.busiest.count, "contribution")} · ${day(r.busiest.date)}`], ["Most Active Month", `${month(`${r.topMonth}-01`)} · ${number.format(r.topCount)}`]);
    }
    return { general, languages, records: record };
  }, [profile, contributions]);
  const tabs: [Tab, string][] = [["general", "General"], ["languages", "Languages"], ["records", "Records"]];

  return <div className="mc-modal-backdrop" onClick={event => { if (event.currentTarget === event.target) onClose(); }}>
    <div className="mc-stats-dialog" ref={dialog} role="dialog" aria-modal="true" aria-labelledby="github-stats-title">
      <h2 id="github-stats-title">GitHub Statistics</h2>
      <div className="mc-stats-tabs" role="group" aria-label="Statistic category">
        {tabs.map(([id, label]) => <button key={id} type="button" className="mc-button" aria-pressed={tab === id} onClick={() => setTab(id)}>{label}</button>)}
      </div>
      <dl className="mc-stats-list">
        {rows[tab].length ? rows[tab].map(([label, value]) => <div key={label}><dt>{label}</dt><dd>{value}</dd></div>) : <div><dt>Nothing to show yet</dt><dd>—</dd></div>}
      </dl>
      <p className="mc-stats-source">Live from <a href={`https://github.com/${stats.username}`} target="_blank" rel="noopener noreferrer">github.com/{stats.username}</a> · refreshed hourly</p>
      <button type="button" className="mc-button mc-stats-done" onClick={onClose}>Done</button>
    </div>
  </div>;
}

const tiers = [
  { max: 0, name: "Stone" },
  { max: 3, name: "Dirt" },
  { max: 9, name: "Grass" },
  { max: 29, name: "Emerald ore" },
  { max: Infinity, name: "Diamond ore" },
];
const WEEKS = 26;

export function ContributionBlocks({ contributions }: { contributions: Contributions }) {
  const [hovered, setHovered] = useState<string | null>(null);
  const cells = useMemo(() => {
    const weeks: Contributions["days"][] = [];
    for (const entry of contributions.days) {
      if (!weeks.length || new Date(`${entry.date}T00:00:00Z`).getUTCDay() === 0) weeks.push([]);
      weeks[weeks.length - 1].push(entry);
    }
    return weeks.slice(-WEEKS).flatMap((week, column) => week.map(entry => {
      const tier = tiers.findIndex(t => entry.count <= t.max);
      return { ...entry, tier, column: column + 1, row: new Date(`${entry.date}T00:00:00Z`).getUTCDay() + 1, label: `${tiers[tier].name} — ${plural(entry.count, "contribution")} · ${day(entry.date)}` };
    }));
  }, [contributions]);
  const total = cells.reduce((sum, cell) => sum + cell.count, 0);
  return <section className="mc-blocks" aria-labelledby="blocks-heading">
    <div className="mc-right-now-heading"><h2 id="blocks-heading">Blocks placed</h2><span>last {WEEKS} weeks · {number.format(total)} contributions</span></div>
    <div className="mc-item-panel mc-blocks-panel">
      <div className="mc-blocks-grid" role="img" aria-label={`Contribution grid for the last ${WEEKS} weeks: ${number.format(total)} contributions`} onMouseLeave={() => setHovered(null)}>
        {cells.map(cell => <span key={cell.date} className={`mc-block mc-block-${cell.tier}`} style={{ gridColumn: cell.column, gridRow: cell.row }} title={cell.label} onMouseEnter={() => setHovered(cell.label)} />)}
      </div>
      <p className="mc-blocks-status" aria-hidden="true">{hovered ?? "Hover a block to inspect it"}</p>
      <ul className="mc-blocks-legend" aria-label="Legend">
        {tiers.map((t, i) => <li key={t.name}><span className={`mc-block mc-block-${i}`} aria-hidden="true" />{t.name} {i === 0 ? "0" : i === tiers.length - 1 ? "30+" : `${tiers[i - 1].max + 1}–${t.max}`}</li>)}
      </ul>
    </div>
  </section>;
}
