import { getSpotifyTrack } from "@/lib/spotify";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const track = await getSpotifyTrack();
    if (!track) {
      // Not configured or no data — let the client fall back to static config.
      return NextResponse.json({ track: null }, { status: 200 });
    }
    return NextResponse.json(
      { track },
      {
        // Cache at the edge for 30s so we don't hammer Spotify on every load.
        headers: { "Cache-Control": "public, max-age=0, s-maxage=30" },
      },
    );
  } catch (error) {
    console.error("Failed to fetch Spotify track:", error);
    return NextResponse.json({ track: null }, { status: 200 });
  }
}
