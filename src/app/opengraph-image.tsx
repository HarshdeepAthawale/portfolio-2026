import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { ImageResponse } from "next/og";

// Social preview card shown when the site is shared (LinkedIn, X, WhatsApp...).
// Uses a screenshot of the current portfolio home page as the banner.
export const alt = "Harshdeep Athawale - Security Researcher/Engineer";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default async function Image() {
  // Pre-cropped to exactly 1200x630 from the current home-page hero.
  const shot = await readFile(join(process.cwd(), "public/assets/og-home.png"));
  const shotSrc = `data:image/png;base64,${shot.toString("base64")}`;

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          backgroundColor: "#f9f6ed",
          backgroundImage: `url(${shotSrc})`,
          backgroundSize: "cover",
          backgroundPosition: "center",
          backgroundRepeat: "no-repeat",
        }}
      />
    ),
    size,
  );
}
