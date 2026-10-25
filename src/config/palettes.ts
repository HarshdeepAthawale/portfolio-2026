/**
 * Terminal colour schemes. Every page is drawn from these variables, so
 * `:theme <name>` recolours the whole site. The first twelve are HANCORE's
 * Omarchy themes (MIT, github.com/HANCORE-linux); dune, paper and matrix are ours.
 */
export type Palette = {
  name: string;
  light: boolean;
  bg: string;
  ink: string;
  /** Comments and decoration only (often low contrast). */
  dim: string;
  accent: string;
  /** Cursor line / panel tint. */
  line: string;
  kw: string;
  str: string;
  fn: string;
  ty: string;
  num: string;
  /** Stat values and alerts (terminal colour 1). */
  red: string;
};

export const palettes: Palette[] = [
  {name: "blackmoney", light: false, bg: "#0c0c0c", ink: "#d8d4b4", dim: "#a8a385", accent: "#d8d4b4", line: "#141414", kw: "#689e80", str: "#2a593f", fn: "#d8d4b4", ty: "#4e5f51", num: "#d8785b", red: "#dd5670"},
  {name: "harbor", light: true, bg: "#dfe4c4", ink: "#1c2d28", dim: "#606c68", accent: "#5e81ac", line: "#ecebbd", kw: "#386593", str: "#4a6a4a", fn: "#386593", ty: "#8f5424", num: "#9d4b25", red: "#b14752"},
  {name: "oxocarbon", light: false, bg: "#161616", ink: "#d0d0d0", dim: "#525252", accent: "#33b1ff", line: "#262626", kw: "#78a9ff", str: "#be95ff", fn: "#ff7eb6", ty: "#78a9ff", num: "#82cfff", red: "#3ddbd9"},
  {name: "kanso", light: false, bg: "#090e13", ink: "#c5c9c7", dim: "#75797f", accent: "#8ba4b0", line: "#22262d", kw: "#8992a7", str: "#8a9a7b", fn: "#8ba4b0", ty: "#8ea4a2", num: "#a292a3", red: "#c4746e"},
  {name: "solitude", light: false, bg: "#101315", ink: "#cacccc", dim: "#4b4e55", accent: "#798186", line: "#1d2022", kw: "#aeaeae", str: "#9fa5a9", fn: "#798186", ty: "#707070", num: "#d9dbdc", red: "#565d60"},
  {name: "sapphire", light: false, bg: "#060d1f", ink: "#e0f7fa", dim: "#51688e", accent: "#f7c3c6", line: "#151d2e", kw: "#85cec4", str: "#6488ea", fn: "#f7c3c6", ty: "#fff6d2", num: "#d5edeb", red: "#e95c4b"},
  {name: "roseofdune", light: true, bg: "#f5e6d3", ink: "#35302a", dim: "#8c7458", accent: "#76634c", line: "#ecdcc6", kw: "#713a56", str: "#76661d", fn: "#9e4f5b", ty: "#713a56", num: "#9b5625", red: "#a02b16"},
  {name: "greeknoir", light: false, bg: "#171717", ink: "#ccd0cf", dim: "#878e87", accent: "#f25623", line: "#202020", kw: "#f89a57", str: "#9cab76", fn: "#88a57d", ty: "#aeab94", num: "#f0913a", red: "#aeab94"},
  {name: "whitegold", light: true, bg: "#dedbc8", ink: "#0c0c14", dim: "#5a5340", accent: "#005c32", line: "#e9e6d3", kw: "#2e311a", str: "#005c32", fn: "#2e311a", ty: "#725c0a", num: "#6c5319", red: "#4B0304"},
  {name: "velvetnight", light: false, bg: "#0a101f", ink: "#ffffff", dim: "#9099a5", accent: "#9099a5", line: "#151b2a", kw: "#f9cbf6", str: "#5c637a", fn: "#c24f40", ty: "#e5af1b", num: "#e2687c", red: "#811139"},
  {name: "lasthorizon", light: false, bg: "#0c0b0c", ink: "#f1f1ef", dim: "#949fa6", accent: "#b59790", line: "#241f22", kw: "#b19be2", str: "#468a9b", fn: "#929fc8", ty: "#b4a4c4", num: "#ea8160", red: "#c38b7b"},
  {name: "mechanoonna", light: false, bg: "#1c1b19", ink: "#d4be98", dim: "#928374", accent: "#d4bd99", line: "#282828", kw: "#ea6962", str: "#89b482", fn: "#a9b665", ty: "#d8a657", num: "#d3869b", red: "#c5564a"},
  {name: "dune", light: false, bg: "#0f0c0b", ink: "#f4eadb", dim: "#6f665e", accent: "#ff8b3e", line: "#1a1512", kw: "#ff8b3e", str: "#d9b98a", fn: "#f2d3a8", ty: "#c9a27e", num: "#ffa465", red: "#ffa465"},
  {name: "paper", light: true, bg: "#fbf6ec", ink: "#1c1714", dim: "#9a8f84", accent: "#b04a14", line: "#f1e8d8", kw: "#b04a14", str: "#6f5427", fn: "#3c2a1e", ty: "#8a5a2b", num: "#a9541c", red: "#a9541c"},
  {name: "matrix", light: false, bg: "#050806", ink: "#c4f5cd", dim: "#3c6645", accent: "#3dff7d", line: "#0b130d", kw: "#3dff7d", str: "#9be7a8", fn: "#e0ffe6", ty: "#6fd889", num: "#c9ff5a", red: "#c9ff5a"},
];

export const DEFAULT_PALETTE = "blackmoney";
export const PALETTE_KEY = "hd.palette";

export function getPalette(name: string | null | undefined) {
  return palettes.find((p) => p.name === name) ?? palettes.find((p) => p.name === DEFAULT_PALETTE)!;
}

const rgb = (hex: string) => [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16));
const mixHex = (a: string, b: string, t: number) => {
  const [x, y] = [rgb(a), rgb(b)];
  return x.map((v, i) => Math.round(v * (1 - t) + y[i]! * t)).join(" ");
};

/** CSS custom properties for one palette: the raw scheme (--p-*) plus derived extras. */
export function paletteVars(p: Palette) {
  const accent = rgb(p.accent).join(" ");
  return [
    `--p-bg:${p.bg}`,
    `--p-ink:${p.ink}`,
    `--p-dim:${p.dim}`,
    `--p-accent:${p.accent}`,
    `--p-line:${p.line}`,
    `--p-kw:${p.kw}`,
    `--p-str:${p.str}`,
    `--p-fn:${p.fn}`,
    `--p-ty:${p.ty}`,
    `--p-num:${p.num}`,
    `--p-red:${p.red}`,
    // Particle fields: ink line drawings on light schemes, glowing accent dust on dark ones.
    `--particle-style:${p.light ? "lines" : "dots"}`,
    `--particle-ink:${rgb(p.ink).join(" ")}`,
    `--particle-node:${accent}`,
    `--particle-dust:${accent}`,
    `--particle-blend:${p.light ? "multiply" : "lighter"}`,
    `--particle-0:rgb(${accent} / 0.35)`,
    `--particle-1:rgb(${mixHex(p.accent, p.ink, 0.25)} / 0.55)`,
    `--particle-2:rgb(${mixHex(p.accent, p.ink, 0.55)} / 0.8)`,
    `--particle-3:rgb(${mixHex(p.accent, p.ink, 0.85)} / 1)`,
    `color-scheme:${p.light ? "light" : "dark"}`,
  ].join(";");
}

/** One stylesheet with every palette, keyed by html[data-palette]. */
export function paletteStylesheet() {
  const fallback = getPalette(DEFAULT_PALETTE);
  return [
    `:root{${paletteVars(fallback)}}`,
    ...palettes.map((p) => `html[data-palette="${p.name}"]{${paletteVars(p)}}`),
  ].join("\n");
}

/**
 * Runs before first paint: applies the saved palette (and the light/dark class
 * that Tailwind's `dark:` variants key on), so there's no flash of the default.
 */
export function paletteBootScript() {
  const light = palettes.filter((p) => p.light).map((p) => p.name);
  return `try{var n=localStorage.getItem(${JSON.stringify(PALETTE_KEY)})||${JSON.stringify(DEFAULT_PALETTE)};var known=${JSON.stringify(palettes.map((p) => p.name))};if(known.indexOf(n)<0)n=${JSON.stringify(DEFAULT_PALETTE)};var d=document.documentElement;d.dataset.palette=n;var l=${JSON.stringify(light)}.indexOf(n)>=0;d.classList.toggle("dark",!l);d.classList.toggle("light",l);}catch(e){}`;
}
