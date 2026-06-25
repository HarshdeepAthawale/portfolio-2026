const TOKEN_ENDPOINT = "https://accounts.spotify.com/api/token";
const NOW_PLAYING_ENDPOINT =
  "https://api.spotify.com/v1/me/player/currently-playing";
const RECENTLY_PLAYED_ENDPOINT =
  "https://api.spotify.com/v1/me/player/recently-played?limit=1";

export type SpotifyTrack = {
  isPlaying: boolean;
  title: string;
  artist: string;
  album: string;
  albumArt: string;
  songUrl: string;
};

function hasSpotifyConfig() {
  return Boolean(
    process.env.SPOTIFY_CLIENT_ID &&
      process.env.SPOTIFY_CLIENT_SECRET &&
      process.env.SPOTIFY_REFRESH_TOKEN,
  );
}

async function getAccessToken(): Promise<string | null> {
  const clientId = process.env.SPOTIFY_CLIENT_ID!;
  const clientSecret = process.env.SPOTIFY_CLIENT_SECRET!;
  const refreshToken = process.env.SPOTIFY_REFRESH_TOKEN!;

  const basic = Buffer.from(`${clientId}:${clientSecret}`).toString("base64");

  const res = await fetch(TOKEN_ENDPOINT, {
    method: "POST",
    headers: {
      Authorization: `Basic ${basic}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams({
      grant_type: "refresh_token",
      refresh_token: refreshToken,
    }),
    cache: "no-store",
  });

  if (!res.ok) return null;
  const data = (await res.json()) as { access_token?: string };
  return data.access_token ?? null;
}

type SpotifyItem = {
  name: string;
  external_urls: { spotify: string };
  artists: { name: string }[];
  album: { name: string; images: { url: string }[] };
};

function normalize(item: SpotifyItem, isPlaying: boolean): SpotifyTrack {
  return {
    isPlaying,
    title: item.name,
    artist: item.artists.map((a) => a.name).join(", "),
    album: item.album.name,
    albumArt: item.album.images[0]?.url ?? "",
    songUrl: item.external_urls.spotify,
  };
}

/**
 * Returns the currently-playing track, or the most recently played one as a
 * fallback. Returns null if Spotify isn't configured or the calls fail — the
 * UI then falls back to the static config.
 */
export async function getSpotifyTrack(): Promise<SpotifyTrack | null> {
  if (!hasSpotifyConfig()) return null;

  const token = await getAccessToken();
  if (!token) return null;

  const headers = { Authorization: `Bearer ${token}` };

  // 1. Currently playing
  const nowRes = await fetch(NOW_PLAYING_ENDPOINT, {
    headers,
    cache: "no-store",
  });

  if (nowRes.status === 200) {
    const data = (await nowRes.json()) as {
      is_playing: boolean;
      item: SpotifyItem | null;
    };
    if (data.item) return normalize(data.item, data.is_playing);
  }

  // 2. Recently played fallback (204 = nothing playing)
  const recentRes = await fetch(RECENTLY_PLAYED_ENDPOINT, {
    headers,
    cache: "no-store",
  });

  if (recentRes.ok) {
    const data = (await recentRes.json()) as {
      items: { track: SpotifyItem }[];
    };
    const track = data.items?.[0]?.track;
    if (track) return normalize(track, false);
  }

  return null;
}
