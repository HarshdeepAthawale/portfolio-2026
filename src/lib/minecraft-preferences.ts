export type MinecraftPreferences = { muted: boolean; volume: number; reduced: boolean };

export const minecraftPreferencesKey = "hd.minecraft.options";
export const defaultMinecraftPreferences: MinecraftPreferences = { muted: true, volume: 0.3, reduced: false };

export function parseMinecraftPreferences(raw: string | null, reduced: boolean): MinecraftPreferences {
  try {
    const stored = JSON.parse(raw || "null");
    if (!stored || typeof stored !== "object") return { ...defaultMinecraftPreferences, reduced };
    return {
      muted: typeof stored.muted === "boolean" ? stored.muted : true,
      volume: typeof stored.volume === "number" && Number.isFinite(stored.volume) ? Math.max(0, Math.min(1, stored.volume)) : 0.3,
      reduced: typeof stored.reduced === "boolean" ? stored.reduced : reduced,
    };
  } catch { return { ...defaultMinecraftPreferences, reduced }; }
}

/** The existing homepage must update when Options changes in another open tab. */
export function subscribeToMinecraftPreferences(
  target: Pick<Window, "addEventListener" | "removeEventListener">,
  systemReduced: boolean,
  onChange: (preferences: MinecraftPreferences) => void,
) {
  const listener = (event: StorageEvent) => {
    if (event.key !== minecraftPreferencesKey && event.key !== null) return;
    onChange(parseMinecraftPreferences(event.newValue, systemReduced));
  };
  target.addEventListener("storage", listener);
  return () => target.removeEventListener("storage", listener);
}
