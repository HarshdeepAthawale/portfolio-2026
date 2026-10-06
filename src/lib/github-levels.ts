// Contribution levels 0-4: empty, then one warm hue stepping light to dark in
// light mode and dim to bright in dark mode. Validated for monotone lightness,
// visible step gaps, and a lightest step that still clears the card (2:1).
// Shared by the grid and its legend.
export const contributionLevelClasses = [
  "bg-foreground/[0.07]",
  "bg-[#dfa671] dark:bg-[#7a4220]",
  "bg-[#c97c3e] dark:bg-[#a6561f]",
  "bg-[#a9541c] dark:bg-[#d9702c]",
  "bg-[#73300e] dark:bg-[#ff9a52]",
] as const;
