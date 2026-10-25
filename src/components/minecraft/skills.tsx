"use client";

import { useEffect, useRef, useState, type CSSProperties } from "react";
import Image from "next/image";
import { skillCategories } from "@/config/minecraft";
import { GameScreen, InventorySlot, minecraftAsset } from "./ui";

const particles = [
  { size: 12, left: -46, dx: "-14px", color: "#b98cff", glow: "#b98cffe6", duration: "3.4s", delay: "0s" },
  { size: 9, left: 30, dx: "12px", color: "#d8b6ff", glow: "#d8b6ffe6", duration: "4.1s", delay: "0.7s" },
  { size: 7, left: -8, dx: "6px", color: "#ffffff", glow: "#ffffffcc", duration: "2.9s", delay: "1.4s" },
  { size: 10, left: 58, dx: "-10px", color: "#9d6bff", glow: "#9d6bffe6", duration: "3.8s", delay: "2.1s" },
  { size: 8, left: -66, dx: "16px", color: "#c9a3ff", glow: "#c9a3ffe6", duration: "4.6s", delay: "2.8s" },
];

type SkillTooltip = { name: string; x: number; y: number };

function SkillSlot({ name, onInspect, onLeave }: { name: string; onInspect: (name: string, element: HTMLDivElement | null) => void; onLeave: () => void }) {
  const label = useRef<HTMLSpanElement>(null);
  const inspect = (element: HTMLDivElement) => onInspect(name, label.current && label.current.scrollWidth > label.current.clientWidth ? element : null);
  return <div className="mc-skill-item" tabIndex={0} onMouseEnter={event => inspect(event.currentTarget)} onMouseLeave={onLeave} onFocus={event => inspect(event.currentTarget)} onBlur={onLeave}>
    <InventorySlot src="images/items/enchanted-book.webp" /><span className="mc-skill-label" ref={label}>{name}</span>
  </div>;
}

export function MinecraftSkills() {
  const [selected, setSelected] = useState(0);
  const [glyphTick, setGlyphTick] = useState(0);
  const [flash, setFlash] = useState(-1);
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const tabs = useRef<HTMLDivElement>(null);
  const panel = useRef<HTMLDivElement>(null);
  const [tooltip, setTooltip] = useState<SkillTooltip | null>(null);
  const inspectSkill = (name: string, element: HTMLDivElement | null) => {
    if (!element || !panel.current) { setTooltip(null); return; }
    const item = element.getBoundingClientRect();
    const parent = panel.current.getBoundingClientRect();
    setTooltip({ name, x: item.left - parent.left + 52, y: item.top - parent.top - 14 });
  };
  const active = skillCategories[selected];
  useEffect(() => {
    const interval = setInterval(() => {
      if (!document.hidden && document.querySelector(".minecraft-root")?.getAttribute("data-motion") !== "reduced") setGlyphTick(value => value + 1);
    }, 340);
    return () => { clearInterval(interval); clearTimeout(timer.current); };
  }, []);
  const select = (index: number) => {
    setSelected(index); setFlash(index); setTooltip(null);
    clearTimeout(timer.current); timer.current = setTimeout(() => setFlash(-1), 520);
  };
  return <GameScreen title="Skills" className="mc-skills-screen">
    <div className="mc-skills-scroll mc-scrollbar" tabIndex={0} role="region" aria-label="Skills content">
      <div className="mc-enchant-gui mc-gui-panel">
        <div className="mc-enchant-top">
          <div className="mc-enchant-book-panel"><h2>Enchant</h2><div className="mc-enchant-stage">
            <span className="mc-glyphs" aria-hidden="true">{Array.from({ length: 9 }, (_, index) => "abcdefghijklmnopqrstuvwxyz"[(glyphTick * 5 + index * 11) % 26]).join(" ")}</span>
            <Image className="mc-floating-book" src={minecraftAsset("images/skills/enchant-book.png")} alt="Open enchantment book" width={177} height={113} unoptimized draggable={false} />
            {particles.map((particle, index) => <i className="mc-enchant-particle" key={index} aria-hidden="true" style={{ width: particle.size, height: particle.size, marginLeft: particle.left, background: particle.color, boxShadow: `0 0 6px ${particle.glow}`, "--dx": particle.dx, "--particle-duration": particle.duration, "--particle-delay": particle.delay } as CSSProperties} />)}
          </div><p>Pick a tool to read its enchantments.</p></div>
          <div className="mc-enchant-tabs" ref={tabs} role="tablist" aria-label="Skill categories" aria-orientation="vertical" onKeyDown={event => {
            if (!["ArrowDown", "ArrowUp", "Home", "End"].includes(event.key)) return;
            event.preventDefault();
            const next = event.key === "Home" ? 0 : event.key === "End" ? skillCategories.length - 1 : (selected + (event.key === "ArrowDown" ? 1 : -1) + skillCategories.length) % skillCategories.length;
            select(next); tabs.current?.querySelectorAll<HTMLButtonElement>("button")[next]?.focus();
          }}>
            {skillCategories.map((category, index) => <button className={`mc-enchant-tab ${selected === index ? "mc-enchant-selected" : ""} ${flash === index ? "mc-enchant-flash" : ""}`} type="button" role="tab" key={category.title} id={`skill-tab-${index}`} aria-selected={selected === index} aria-controls="enchantment-list" tabIndex={selected === index ? 0 : -1} onClick={() => select(index)}>
              <InventorySlot src={`images/skills/${category.icon}`} />
              <span className="mc-enchant-category"><span className="mc-category-glyphs" aria-hidden="true">{category.title}</span><span>{category.title}</span><small>{category.items.length} enchantments</small></span>
              <span className="mc-enchant-level"><Image className="mc-item-orb" src={minecraftAsset("images/experience-orb.png")} alt="" width={360} height={360} unoptimized aria-hidden="true" />{index + 1}</span>
            </button>)}
          </div>
        </div>
        <div className="mc-enchantment-list" ref={panel} id="enchantment-list" role="tabpanel" aria-labelledby={`skill-tab-${selected}`} tabIndex={0}>
          <div className="mc-skill-heading"><h3>{active.title}</h3><span>{active.items.length} applied</span></div>
          <div className="mc-skill-grid mc-scrollbar" key={active.title} onScroll={() => setTooltip(null)}>
            {active.items.map(item => <SkillSlot key={item} name={item} onInspect={inspectSkill} onLeave={() => setTooltip(null)} />)}
          </div>
          {tooltip && <span className="mc-item-tooltip mc-skill-tooltip" aria-hidden="true" style={{ left: tooltip.x, top: tooltip.y, maxWidth: `calc(100% - ${tooltip.x}px - 8px)` }}>{tooltip.name}</span>}
        </div>
      </div>
    </div>
  </GameScreen>;
}
