"use client";

import { useEffect, useRef } from "react";
import type { EditorData } from "@/lib/editor/types";
import { Brand, Elsewhere } from "./brand";
import { mountEditor } from "./editor";

/**
 * /site: the static frame of the editor. Everything inside it is driven by
 * `mountEditor` once the page is on screen.
 */
export function EditorView({ data, links }: { data: EditorData; links: { name: string; href: string }[] }) {
  const root = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!root.current) return;
    return mountEditor(root.current, data);
  }, [data]);

  return (
    <div className="hc" ref={root}>
      <main className="hc-stage hc-site">
        <header className="hc-top">
          <Brand tip="back to the intro" />
          <Elsewhere links={links} />
        </header>

        <h1 className="hc-sr">{data.owner}: security research, projects and writing, opened in an editor.</h1>

        <section className="hc-editor" aria-label="Editor">
          <button className="hc-tabline" type="button" aria-expanded="false" aria-controls="hc-tree">
            <span className="tab-dir">~</span>
            <span className="tab-file" />
            <span className="tab-toggle" aria-hidden="true">
              ↓
            </span>
          </button>
          <nav className="hc-wheel" id="hc-tree" aria-label="Entries" />
          <div className="hc-pane">
            <p className="hc-winbar" />
            <div className="hc-buffer" tabIndex={0} aria-live="polite" />
            <div className="hc-eye" aria-hidden="true" />
          </div>
        </section>

        <div className="hc-bar">
          <p className="bar-id" aria-hidden="true">
            <span className="bar-title">{data.handle.toUpperCase()}</span>
            <span className="bar-sub">
              <span className="cmd" />
              <span className="hunt" />
              <span className="keys" />
            </span>
          </p>
          <div className="bar-cols" aria-hidden="true" />
          <div className="bar-state" aria-hidden="true">
            <p className="col">
              <span className="label">WORM</span>
              <span className="value" data-k="worm">
                asleep
              </span>
            </p>
            <p className="col">
              <span className="label">EYE</span>
              <span className="value" data-k="eye">
                closed
              </span>
            </p>
            <p className="col">
              <span className="label">GHOST</span>
              <span className="value" data-k="ghost">
                idle
              </span>
            </p>
          </div>
          <button className="hc-den" type="button" aria-label="worm" aria-pressed="false" data-tip="wake the worm" />
          <p className="bar-graph" aria-hidden="true">
            <span className="label span">VISITORS</span>
            <span className="value end" />
            <canvas />
          </p>
        </div>
        <div className="hc-desk" aria-hidden="true" />

        {/* The same content as plain text, for screen readers and crawlers. */}
        <div className="hc-sr">
          {data.entries.map((entry) => (
            <section key={entry.id}>
              <h2>{entry.label}</h2>
              <p>{entry.text.slice(0, 600)}</p>
              {entry.href && <a href={entry.href}>{entry.href}</a>}
            </section>
          ))}
        </div>
      </main>
      <canvas className="hc-overlay" aria-hidden="true" />
    </div>
  );
}
