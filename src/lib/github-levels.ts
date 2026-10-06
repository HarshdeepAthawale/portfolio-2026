// Contribution levels 0-4 as a warm sun ramp (one hue, light to dark in light
// mode, dim to bright in dark mode). Shared by the grid and its legend.
export const contributionLevelClasses = [
  "bg-foreground/[0.06]",
  "bg-[#f6e1c8] dark:bg-[#3a2418]",
  "bg-[#efbd8f] dark:bg-[#6e3b1c]",
  "bg-[#e08a4c] dark:bg-[#b45d24]",
  "bg-[#b8501a] dark:bg-[#ff8b3e]",
] as const;
