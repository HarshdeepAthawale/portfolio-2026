"use client";

import Link from "next/link";
import Image from "next/image";
import { useEffect, useRef, useState } from "react";
import { heroConfig } from "@/config/hero";
import { aboutConfig } from "@/config/about";
import { currentInventory } from "@/config/minecraft";
import { GameScreen, GameTags, InventorySlot } from "./ui";
import { GameScroll } from "./game-scroll";
import type { CSSProperties } from "react";

function ContactBook({ onClose }: { onClose: () => void }) {
  const [email, setEmail] = useState("");
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const dialog = useRef<HTMLDivElement>(null);
  const previousFocus = useRef<HTMLElement | null>(null);
  useEffect(() => {
    previousFocus.current = document.activeElement as HTMLElement;
    dialog.current?.querySelector("input")?.focus();
    const key = (event: KeyboardEvent) => {
      if (event.key === "Escape") { event.stopImmediatePropagation(); onClose(); }
      if (event.key !== "Tab") return;
      const elements = dialog.current?.querySelectorAll<HTMLElement>('input, textarea, button, a[href]');
      if (!elements?.length) return;
      if (event.shiftKey && document.activeElement === elements[0]) { event.preventDefault(); elements[elements.length - 1].focus(); }
      else if (!event.shiftKey && document.activeElement === elements[elements.length - 1]) { event.preventDefault(); elements[0].focus(); }
    };
    document.addEventListener("keydown", key, true);
    return () => { document.removeEventListener("keydown", key, true); previousFocus.current?.focus(); };
  }, [onClose]);
  const compose = () => {
    const body = `${message}${email ? `\n\nReply to: ${email}` : ""}`;
    location.href = `mailto:${heroConfig.email}?subject=${encodeURIComponent(subject || "Hello from your portfolio")}&body=${encodeURIComponent(body)}`;
  };
  return <div className="mc-modal-backdrop mc-contact-backdrop" onClick={event => { if (event.currentTarget === event.target) onClose(); }}>
    <div className="mc-contact-dialog" ref={dialog} role="dialog" aria-modal="true" aria-label="Write a message">
      <div className="mc-contact-book"><section><p className="mc-book-page-number">Page 1 of 2</p><div className="mc-book-fields"><label>Email<input type="email" value={email} onChange={event => setEmail(event.target.value)} maxLength={150} /></label><label>Subject<input value={subject} onChange={event => setSubject(event.target.value)} maxLength={160} /></label></div><span className="mc-book-feather" aria-hidden="true" /></section>
        <section><p className="mc-book-page-number">Page 2 of 2</p><button className="mc-book-close" type="button" aria-label="Close contact book" onClick={onClose}>X</button><label className="sr-only" htmlFor="contact-message">Message</label><textarea id="contact-message" value={message} onChange={event => setMessage(event.target.value)} maxLength={800} /><p className="mc-book-counter">{message.length} / 800</p><span className="mc-book-feather" aria-hidden="true" /></section></div>
      <div className="mc-contact-actions"><button type="button" className="mc-button" onClick={onClose}>Cancel</button><button type="button" className="mc-button" aria-label={`Open email app to send your message to ${heroConfig.email}`} disabled={message.trim().length < 5 || (email.length > 0 && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))} onClick={compose}>Open Mail</button></div>
    </div>
  </div>;
}

export function MinecraftAbout() {
  const [expanded, setExpanded] = useState<number | null>(null);
  const [contact, setContact] = useState(false);
  const closeContact = useRef(() => setContact(false)).current;
  return <GameScreen title="About Me" className="mc-about-screen">
    <section className="mc-dark-panel mc-about-panel" aria-label="About Harshdeep"><GameScroll className="mc-about-scroll" aria-label="About me content">
      <div className="mc-about-grid">
        <aside className="mc-about-sidebar">
          <div className="mc-portrait-frame"><div className="mc-portrait-window"><Image src={aboutConfig.portrait.src} alt={`${heroConfig.name}, waist-up portrait`} width={960} height={1280} sizes="(min-width: 900px) 390px, 120vw" priority /></div></div>
          <h2 className="mc-item-panel mc-profile-name">{heroConfig.name}</h2>
          <div className="mc-profile-divider" aria-hidden="true">✦</div>
          <dl className="mc-profile-facts"><div><dt>Studying</dt><dd>Computer Engineering</dd></div><div><dt>From</dt><dd>{heroConfig.location}</dd></div><div><dt>Currently</dt><dd>Student @ TIET</dd></div></dl>
          <GameTags items={["AppSec", "Bug Bounty", "AI"]} />
          <div className="mc-about-buttons"><a className="mc-button" href="/assets/resume.pdf" target="_blank" rel="noopener noreferrer">Resume</a><button className="mc-button" type="button" onClick={() => setContact(true)} aria-haspopup="dialog">Contact</button></div>
          <Link className="mc-achievements-link" href="/achievements">View achievements <span>→</span></Link>
        </aside>
        <div className="mc-about-content">
          <section className="mc-item-panel mc-about-intro"><p>Hi, I’m Harshdeep! I’m a security researcher and engineer who builds software and breaks it. {heroConfig.bio.replace("I build software and break web and mobile apps to report critical bugs - ", "")} Finding the bugs is what taught me to build the defenses.</p><p className="mc-availability"><span/> {heroConfig.availability}</p></section>
          <section className="mc-right-now"><div className="mc-right-now-heading"><h2>Right now</h2><span>click a slot to open it</span></div>
            {currentInventory.map((item, index) => <div className="mc-now-item" key={item.label}><button type="button" className={`mc-item-panel mc-now-button mc-now-${item.motion}`} style={{ "--item-duration": item.duration, "--item-scale": `${item.iconScale * 100}%` } as CSSProperties} aria-expanded={expanded === index} aria-controls={`now-note-${index}`} onClick={() => setExpanded(value => value === index ? null : index)}><InventorySlot src={item.icon} /><span className="mc-now-text"><small>{item.label}</small><span>{item.value}</span></span><span className="mc-plus">{expanded === index ? "−" : "+"}</span><span className="mc-item-tooltip" aria-hidden="true">{item.tooltip}</span></button>{expanded === index && <p className="mc-now-note" id={`now-note-${index}`}>{item.note}</p>}</div>)}
          </section>
        </div>
      </div>
    </GameScroll></section>
    {contact && <ContactBook onClose={closeContact} />}
  </GameScreen>;
}
