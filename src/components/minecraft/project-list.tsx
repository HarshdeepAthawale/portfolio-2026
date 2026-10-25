"use client";

import { useMemo, useRef, useState } from "react";
import { useWorld } from "./world";
import { projects } from "@/config/projects";
import { GameButton, GameScreen, GameTags } from "./ui";
import { GameScroll } from "./game-scroll";

export function MinecraftProjects() {
  const { navigate } = useWorld();
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState<string | null>(null);
  const list = useRef<HTMLDivElement>(null);
  const filtered = useMemo(() => projects.filter(project => `${project.title} ${project.description} ${project.tech.join(" ")}`.toLowerCase().includes(query.toLowerCase())), [query]);
  const current = projects.find(project => project.slug === selected);
  const select = (slug: string) => setSelected(slug);
  const open = () => { if (current) navigate(`/projects/${current.slug}`); };

  return <GameScreen title="Select Project" className="mc-projects-screen" actions={<>
    <GameButton disabled={!current} onClick={open}>Open</GameButton>
    <GameButton disabled={!current} onClick={() => { if (current) window.open(current.href, "_blank", "noopener,noreferrer"); }}>GitHub</GameButton>
    <GameButton disabled={!current} onClick={() => { setSelected(null); list.current?.focus(); }}>Cancel</GameButton>
    <GameButton href="/">Back</GameButton>
  </>}>
    <section className="mc-dark-panel mc-project-panel">
      <label className="sr-only" htmlFor="project-search">Search projects</label>
      <input id="project-search" type="search" className="mc-search" value={query} onChange={event => { setQuery(event.target.value); setSelected(null); }} placeholder="Search projects…" onKeyDown={event => { if (event.key === "Escape") { event.preventDefault(); setQuery(""); event.currentTarget.blur(); } }} />
      <GameScroll ref={list} className="mc-project-list" role="listbox" aria-label="Projects" aria-activedescendant={selected ? `project-${selected}` : undefined} onKeyDown={event => {
        if (event.key === "Escape") { event.stopPropagation(); setSelected(null); }
        if (event.key === "Enter" && current) { event.preventDefault(); open(); }
        if (["ArrowDown", "ArrowUp", "Home", "End"].includes(event.key) && filtered.length) {
          event.preventDefault();
          const index = filtered.findIndex(project => project.slug === selected);
          const next = event.key === "Home" ? 0 : event.key === "End" ? filtered.length - 1 : event.key === "ArrowDown" ? (index + 1) % filtered.length : (index <= 0 ? filtered.length : index) - 1;
          setSelected(filtered[next].slug);
          document.getElementById(`project-${filtered[next].slug}`)?.scrollIntoView({ block: "nearest" });
        }
      }}>
        {filtered.map(project => <div key={project.slug} id={`project-${project.slug}`} role="option" aria-selected={selected === project.slug} tabIndex={-1} className={`mc-project-row ${selected === project.slug ? "mc-row-selected" : ""}`} onClick={() => { select(project.slug); list.current?.focus(); }} onDoubleClick={() => navigate(`/projects/${project.slug}`)}>
          <div className={`mc-project-icon mc-project-icon-${project.scene}`} aria-hidden="true"><span>{project.monogram}</span></div>
          <div className="mc-project-info"><div className="mc-project-title"><h2>{project.title}</h2><span>{project.date.split(".")[1]}</span></div><p>{project.description}</p><GameTags items={project.tech} /></div>
          <div className="mc-project-status"><span className="mc-signal" aria-hidden="true"><i/><i/><i/><i/></span><span>Released</span></div>
        </div>)}
        {!filtered.length && <p className="mc-empty">No projects found.<br/><span>Try Python, security, AI, or Next.js.</span></p>}
      </GameScroll>
      <p className="mc-list-count" role="status">{filtered.length} {filtered.length === 1 ? "project" : "projects"} · select a project for actions</p>
    </section>
  </GameScreen>;
}
