#!/usr/bin/env node
/**
 * One-time helper to generate a Spotify refresh token for the "Now Playing" card.
 *
 * Prereqs:
 *   1. Create an app at https://developer.spotify.com/dashboard
 *   2. In the app settings, add this Redirect URI: http://127.0.0.1:8888/callback
 *   3. Put SPOTIFY_CLIENT_ID and SPOTIFY_CLIENT_SECRET in .env.local
 *      (or pass them as env vars when running this script).
 *
 * Run:  node scripts/get-spotify-refresh-token.mjs
 * Then open the printed URL, approve, and copy the SPOTIFY_REFRESH_TOKEN it prints.
 */
import http from "node:http";
import { readFileSync } from "node:fs";

const REDIRECT_URI = "http://127.0.0.1:8888/callback";
const SCOPE = "user-read-currently-playing user-read-recently-played";

function loadEnvLocal() {
  try {
    const raw = readFileSync(new URL("../.env.local", import.meta.url), "utf8");
    for (const line of raw.split("\n")) {
      const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
      if (m && !process.env[m[1]]) process.env[m[1]] = m[2].trim();
    }
  } catch {
    // no .env.local — rely on process env
  }
}

loadEnvLocal();

const clientId = process.env.SPOTIFY_CLIENT_ID;
const clientSecret = process.env.SPOTIFY_CLIENT_SECRET;

if (!clientId || !clientSecret) {
  console.error(
    "\n✗ Missing SPOTIFY_CLIENT_ID / SPOTIFY_CLIENT_SECRET.\n" +
      "  Add them to .env.local or pass them as env vars, then re-run.\n",
  );
  process.exit(1);
}

const authUrl =
  "https://accounts.spotify.com/authorize?" +
  new URLSearchParams({
    response_type: "code",
    client_id: clientId,
    scope: SCOPE,
    redirect_uri: REDIRECT_URI,
  });

console.log("\n1. Open this URL in your browser and approve access:\n");
console.log("   " + authUrl + "\n");
console.log("2. Waiting for the redirect on " + REDIRECT_URI + " ...\n");

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, "http://127.0.0.1:8888");
  if (url.pathname !== "/callback") {
    res.writeHead(404).end();
    return;
  }

  const code = url.searchParams.get("code");
  if (!code) {
    res.writeHead(400).end("Missing ?code");
    return;
  }

  const basic = Buffer.from(`${clientId}:${clientSecret}`).toString("base64");
  const tokenRes = await fetch("https://accounts.spotify.com/api/token", {
    method: "POST",
    headers: {
      Authorization: `Basic ${basic}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams({
      grant_type: "authorization_code",
      code,
      redirect_uri: REDIRECT_URI,
    }),
  });

  const data = await tokenRes.json();

  if (!data.refresh_token) {
    res.writeHead(500).end("No refresh token returned. Check the console.");
    console.error("\n✗ Token exchange failed:", data, "\n");
    server.close();
    process.exit(1);
  }

  res
    .writeHead(200, { "Content-Type": "text/html" })
    .end("<h2>✓ Done. You can close this tab and return to the terminal.</h2>");

  console.log("✓ Success! Add this line to your .env.local:\n");
  console.log("   SPOTIFY_REFRESH_TOKEN=" + data.refresh_token + "\n");

  server.close();
  process.exit(0);
});

server.listen(8888);
