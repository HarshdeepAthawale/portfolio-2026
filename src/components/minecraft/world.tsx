"use client";

import { usePathname, useRouter } from "next/navigation";
import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from "react";
import { Panorama } from "./panorama";
import { defaultMinecraftPreferences, minecraftPreferencesKey, parseMinecraftPreferences, subscribeToMinecraftPreferences } from "@/lib/minecraft-preferences";

const initial = defaultMinecraftPreferences;
const tracks = [{ name: "menu-music", gain: 1 }, { name: "creative1", gain: 0.417 }, { name: "hal2", gain: 0.786 }, { name: "menu1", gain: 0.888 }];
// The panorama is colour-graded to the visitor's local time of day.
const timeOfDay = (hour: number) => hour >= 5 && hour < 8 ? "dawn" : hour >= 8 && hour < 17 ? "day" : hour >= 17 && hour < 20 ? "dusk" : "night";
const WorldContext = createContext<{ playClick: () => void; navigate: (href: string) => void; reduced: boolean } | null>(null);
export function useWorld() {
  const context = useContext(WorldContext);
  if (!context) throw new Error("Game controls need the MinecraftWorld provider.");
  return context;
}

function ControlIcon({ type }: { type: "muted" | "volume" | "settings" }) {
  return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    {type === "settings" ? <><path d="M9.671 4.136a2.34 2.34 0 0 1 4.659 0 2.34 2.34 0 0 0 3.319 1.915 2.34 2.34 0 0 1 2.33 4.033 2.34 2.34 0 0 0 0 3.831 2.34 2.34 0 0 1-2.33 4.033 2.34 2.34 0 0 0-3.319 1.915 2.34 2.34 0 0 1-4.659 0 2.34 2.34 0 0 0-3.32-1.915 2.34 2.34 0 0 1-2.33-4.033 2.34 2.34 0 0 0 0-3.831A2.34 2.34 0 0 1 6.35 6.051a2.34 2.34 0 0 0 3.319-1.915"/><circle cx="12" cy="12" r="3"/></> : <><path d="M11 4.702a.705.705 0 0 0-1.203-.498L6.413 7.587A1.4 1.4 0 0 1 5.416 8H3a1 1 0 0 0-1 1v6a1 1 0 0 0 1 1h2.416a1.4 1.4 0 0 1 .997.413l3.383 3.384A.705.705 0 0 0 11 19.298Z"/>{type === "muted" ? <path d="m22 9-6 6m0-6 6 6"/> : <path d="M16 9a5 5 0 0 1 0 6m3.364 3.364a9 9 0 0 0 0-12.728"/>}</>}
  </svg>;
}

export function MinecraftWorld({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [preferences, setPreferences] = useState(initial);
  const [ready, setReady] = useState(false);
  const [options, setOptions] = useState(false);
  const [song, setSong] = useState(0);
  const songQueue = useRef<number[]>([]);
  const [loading, setLoading] = useState<number | null>(null);
  const [booted, setBooted] = useState(false);
  const [time, setTime] = useState("day");
  const music = useRef<HTMLAudioElement | null>(null);
  const clickAudio = useRef<HTMLAudioElement | null>(null);
  const timeouts = useRef<ReturnType<typeof setTimeout>[]>([]);
  const optionsPanel = useRef<HTMLDivElement>(null);
  const optionsButton = useRef<HTMLButtonElement>(null);
  const previousPath = useRef(pathname);
  const settingsRef = useRef(preferences);
  const routeRef = useRef(pathname);
  const changingSong = useRef(false);
  const songRef = useRef(song);
  settingsRef.current = preferences;
  routeRef.current = pathname;
  songRef.current = song;

  const clearTimers = useCallback(() => {
    timeouts.current.forEach(clearTimeout);
    timeouts.current = [];
  }, []);

  const nextSong = useCallback(() => {
    changingSong.current = true;
    if (!songQueue.current.length) {
      const queue = tracks.map((_, index) => index);
      for (let i = queue.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [queue[i], queue[j]] = [queue[j], queue[i]];
      }
      if (queue[0] === songRef.current) [queue[0], queue[1]] = [queue[1], queue[0]];
      songQueue.current = queue;
    }
    const next = songQueue.current.shift()!;
    songRef.current = next;
    setSong(next);
  }, []);

  useEffect(() => {
    const systemReduced = matchMedia("(prefers-reduced-motion: reduce)").matches;
    try {
      setPreferences(parseMinecraftPreferences(localStorage.getItem(minecraftPreferencesKey), systemReduced));
    } catch { setPreferences({ ...initial, reduced: systemReduced }); }
    // The homepage can remain open while Options is changed in another tab.
    // Keep that already-mounted panorama in sync instead of leaving it paused.
    const unsubscribe = subscribeToMinecraftPreferences(window, systemReduced, next => {
      setPreferences(current => current.muted === next.muted && current.volume === next.volume && current.reduced === next.reduced ? current : next);
    });
    clickAudio.current = new Audio("/minecraft/audio/button-click.mp3");
    clickAudio.current.volume = 0.45;
    setReady(true);
    return () => { unsubscribe(); clearTimers(); clickAudio.current?.pause(); };
  }, [clearTimers]);

  useEffect(() => {
    // The first-load screen only shows when loading takes longer than its CSS delay.
    let done = false;
    const finish = () => { if (!done) { done = true; setBooted(true); } };
    const fonts = document.fonts?.ready ?? Promise.resolve();
    const page = document.readyState === "complete" ? Promise.resolve() : new Promise(resolve => window.addEventListener("load", resolve, { once: true }));
    void Promise.all([fonts, page]).then(finish);
    const fallback = setTimeout(finish, 6000);
    const tick = () => setTime(timeOfDay(new Date().getHours()));
    tick();
    const clock = setInterval(tick, 60_000);
    return () => { clearTimeout(fallback); clearInterval(clock); };
  }, []);

  useEffect(() => {
    if (!ready) return;
    try {
      const serialized = JSON.stringify(preferences);
      if (localStorage.getItem(minecraftPreferencesKey) !== serialized) localStorage.setItem(minecraftPreferencesKey, serialized);
    } catch { /* Optional persistence. */ }
  }, [preferences, ready]);

  useEffect(() => {
    const audio = new Audio(`/minecraft/audio/${tracks[song].name}.mp3`);
    audio.preload = "none";
    audio.volume = settingsRef.current.volume * tracks[song].gain;
    music.current = audio;
    const next = nextSong;
    audio.addEventListener("ended", next);
    // Playback only starts after the user enables sound.
    if (changingSong.current && !settingsRef.current.muted) void audio.play().catch(() => {});
    changingSong.current = false;
    return () => { audio.pause(); audio.removeEventListener("ended", next); audio.removeAttribute("src"); audio.load(); };
  }, [song, nextSong]);

  useEffect(() => {
    const audio = music.current;
    if (!audio) return;
    audio.volume = preferences.volume * tracks[song].gain;
    if (preferences.muted) audio.pause();
    else void audio.play().catch(() => {});
  }, [preferences.muted, preferences.volume, song]);

  const playClick = useCallback(() => {
    if (settingsRef.current.muted || !clickAudio.current) return;
    clickAudio.current.currentTime = 0;
    void clickAudio.current.play().catch(() => {});
  }, []);

  const beginTransition = useCallback(() => {
    clearTimers();
    setLoading(12);
    [34, 61, 84, 93].forEach((step, index) => {
      timeouts.current.push(setTimeout(() => setLoading(step), [70, 155, 260, 390][index]));
    });
    timeouts.current.push(setTimeout(() => setLoading(null), 5000));
  }, [clearTimers]);

  const navigate = useCallback((href: string) => {
    if (!settingsRef.current.reduced) beginTransition();
    router.push(href);
  }, [beginTransition, router]);

  useEffect(() => {
    if (previousPath.current === pathname) return;
    previousPath.current = pathname;
    clearTimers();
    setLoading(100);
    const timer = setTimeout(() => setLoading(null), preferences.reduced ? 0 : 220);
    return () => clearTimeout(timer);
  }, [pathname, preferences.reduced, clearTimers]);

  useEffect(() => {
    const onClick = (event: MouseEvent) => {
      const target = event.target;
      if (!(target instanceof Element)) return;
      if (target.closest("button, a, [role='tab'], [role='option']")) playClick();
      const anchor = target.closest<HTMLAnchorElement>("a[href]");
      if (!anchor || anchor.target === "_blank" || anchor.hasAttribute("download") || event.button !== 0 || event.ctrlKey || event.metaKey || event.shiftKey || event.altKey) return;
      const url = new URL(anchor.href, location.href);
      if (url.origin === location.origin && url.pathname !== routeRef.current && !settingsRef.current.reduced) beginTransition();
    };
    const onKey = (event: KeyboardEvent) => {
      if (event.key !== "Escape" || event.defaultPrevented || event.repeat || options || routeRef.current === "/" || document.querySelector('[role="dialog"]')) return;
      event.preventDefault();
      playClick();
      const backHref = document.querySelector<HTMLElement>("main[data-back-href]")?.dataset.backHref ?? "/";
      if (!settingsRef.current.reduced) beginTransition();
      router.push(backHref);
    };
    const onPop = () => { if (!settingsRef.current.reduced) beginTransition(); };
    document.addEventListener("click", onClick);
    document.addEventListener("keydown", onKey);
    window.addEventListener("popstate", onPop);
    return () => { document.removeEventListener("click", onClick); document.removeEventListener("keydown", onKey); window.removeEventListener("popstate", onPop); };
  }, [beginTransition, options, playClick, router]);

  useEffect(() => {
    if (!options) return;
    const panel = optionsPanel.current;
    const previousFocus = document.activeElement as HTMLElement | null;
    panel?.querySelector<HTMLInputElement>("input")?.focus();
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") { event.preventDefault(); setOptions(false); }
      if (event.key !== "Tab" || !panel) return;
      const elements = Array.from(panel.querySelectorAll<HTMLElement>('button, input, a[href]'));
      const first = elements[0]; const last = elements[elements.length - 1];
      if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last?.focus(); }
      else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first?.focus(); }
    };
    document.addEventListener("keydown", onKey);
    return () => { document.removeEventListener("keydown", onKey); previousFocus?.focus(); };
  }, [options]);

  return <WorldContext.Provider value={{ playClick, navigate, reduced: preferences.reduced }}>
    <div className={`minecraft-root ${pathname === "/" ? "mc-home-world" : "mc-inner-world"} ${pathname.startsWith("/blog/") || pathname.startsWith("/preview/blog/") ? "mc-flow-world" : ""}`} data-motion={preferences.reduced ? "reduced" : "full"} data-time={time}>
      <Panorama reduced={preferences.reduced} />
      <div className="mc-world-time" aria-hidden="true" />
      <div className="mc-world-shade" aria-hidden="true" />
      <a className="mc-skip-link" href="#main-content">Skip to content</a>
      {children}
      <div className="mc-corner-controls">
        <button className="mc-button mc-icon-button" type="button" aria-label={preferences.muted ? "Unmute all sounds" : "Mute all sounds"} aria-pressed={!preferences.muted} disabled={!ready} onClick={() => setPreferences(value => ({ ...value, muted: !value.muted }))}><ControlIcon type={preferences.muted ? "muted" : "volume"} /></button>
        <button ref={optionsButton} className="mc-button mc-icon-button" type="button" aria-label="Options" aria-haspopup="dialog" aria-expanded={options} aria-controls="minecraft-options" onClick={() => setOptions(value => !value)}><ControlIcon type="settings" /></button>
      </div>
      {options && <div className="mc-modal-backdrop" onClick={event => { if (event.target === event.currentTarget) setOptions(false); }}>
        <div className="mc-options mc-gui-panel" ref={optionsPanel} id="minecraft-options" role="dialog" aria-modal="true" aria-labelledby="options-title">
          <h2 id="options-title">Options</h2>
          <label className="mc-volume-label" htmlFor="mc-volume">Music Volume: {Math.round(preferences.volume * 100)}%</label>
          <input id="mc-volume" aria-label="Music volume" type="range" min="0" max="1" step="0.05" value={preferences.volume} onChange={event => setPreferences(value => ({ ...value, volume: Number(event.target.value) }))} />
          <p>Music</p>
          <div className="mc-now-playing">
            <span className="mc-disc-slot"><img className={`mc-disc ${preferences.muted ? "" : "mc-disc-spinning"}`} src="/minecraft/images/items/music-disc.png" alt="" /></span>
            <span className="mc-now-playing-text"><small>{preferences.muted ? "Muted" : "Now playing"}</small><span>{tracks[song].name}</span><small>Track {song + 1} of {tracks.length}</small></span>
          </div>
          <button type="button" className="mc-option-toggle mc-next-song" onClick={nextSong}>Next Song</button>
          <p>Motion</p>
          <div className="mc-motion-buttons" role="group" aria-label="Motion preference">
            {[false, true].map(reduced => <button type="button" key={String(reduced)} className="mc-option-toggle" aria-pressed={preferences.reduced === reduced} onClick={() => setPreferences(value => ({ ...value, reduced }))}>{reduced ? "Reduced" : "Full"}</button>)}
          </div>
          <small>Reduced stops panorama drift, splash bounce, and smooth scrolling.</small>
          <button type="button" className="mc-button mc-full-width" onClick={() => setOptions(false)}>Done</button>
        </div>
      </div>}
      {!booted && <div className="mc-boot" role="status" aria-label="Generating world"><p>Generating world</p><span>Building terrain</span><div className="mc-boot-track"><div /></div></div>}
      {loading !== null && <div className={`mc-loading ${loading === 100 ? "mc-loading-fade" : ""}`} role="status" aria-live="polite" aria-label={`${loading < 35 ? "Loading level" : loading < 70 ? "Building terrain" : loading < 100 ? "Generating chunks" : "Ready"}, ${loading} percent`}>
        <p>{loading < 35 ? "Loading level" : loading < 70 ? "Building terrain" : loading < 100 ? "Generating chunks" : "Ready!"}</p>
        <span>{loading}%</span><div className="mc-loading-track"><div style={{ width: `${loading}%` }} /></div>
      </div>}
    </div>
  </WorldContext.Provider>;
}
