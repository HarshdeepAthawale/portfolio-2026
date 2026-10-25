"use client";

import { useEffect, useRef } from "react";
import { Brand, Elsewhere } from "./brand";
import { mountIntro, type WallFile } from "./intro";

/** The intro's static frame; `mountIntro` animates the wall inside it. */
export function IntroView({ files, links, note }: { files: WallFile[]; links: { name: string; href: string }[]; note: string }) {
  const root = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!root.current) return;
    return mountIntro(root.current, files);
  }, [files]);

  return (
    <div className="hc hc-intro" ref={root}>
      <main className="hc-stage">
        <Brand />
        <Elsewhere links={links} />
        <h1 className="hc-sr">Harshdeep Athawale: security researcher and engineer. {note}</h1>
        <canvas className="hc-wall" aria-hidden="true" />
        <div className="hc-eye" aria-hidden="true" />
        <div className="hc-desk" aria-hidden="true" />
        <p className="hc-status" aria-hidden="true">
          <span className="mode">NORMAL</span>
          <span className="path" />
          <span className="pos" />
        </p>
        <p className="hc-cmdline" aria-hidden="true">
          <span className="cmd" />
          <span className="showcmd" />
        </p>
        <a className="hc-enter" href="/site" aria-label="Enter">
          enter ↩
        </a>
        <button className="hc-theme-key" type="button" aria-label="Change theme">
          <span className="hc-prompt-glyph" aria-hidden="true" />
          :theme
        </button>
        <p className="hc-note" aria-hidden="true">
          {note}
        </p>
        {/* The watcher wants a buffer and a status bar; the intro has neither. */}
        <div className="hc-ghost-buffer" hidden />
        <div className="hc-ghost-status" hidden />
        <nav className="hc-sr" aria-label="Code shown on this page">
          {files.map((file) => (
            <span key={file.path}>{file.path} </span>
          ))}
        </nav>
      </main>
      <canvas className="hc-overlay" aria-hidden="true" />
    </div>
  );
}
