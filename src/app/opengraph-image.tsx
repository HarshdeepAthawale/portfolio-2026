import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { ImageResponse } from "next/og";

// Social preview card shown when the site is shared (LinkedIn, X, WhatsApp...).
export const alt = "Harshdeep Athawale - Security Researcher/Engineer";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

const stats = ["35+ vulnerability reports", "CVSS 9.1 at Red Bull", "1st place · Nio Hack"];

export default async function Image() {
  const avatar = await readFile(join(process.cwd(), "public/assets/avatar.png"));
  const avatarSrc = `data:image/png;base64,${avatar.toString("base64")}`;

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          padding: "72px 80px",
          background: "#0f0c0b",
          color: "#fff6e5",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 56 }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={avatarSrc}
            alt=""
            width={220}
            height={220}
            style={{
              borderRadius: 9999,
              objectFit: "cover",
              border: "2px solid rgba(255, 246, 229, 0.2)",
            }}
          />
          <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            <div style={{ fontSize: 76, fontWeight: 600, letterSpacing: -3, lineHeight: 1 }}>
              Harshdeep Athawale
            </div>
            <div style={{ fontSize: 40, fontWeight: 600, color: "#ff8b3e" }}>
              Security Researcher/Engineer
            </div>
            <div style={{ fontSize: 26, color: "#b1aca6", marginTop: 6 }}>
              Red Bull · Netflix · Goldman Sachs · Adobe · NVIDIA · Anduril
            </div>
            <div style={{ fontSize: 26, color: "#7a746e", marginTop: 18 }}>
              harshdeepathawale.in
            </div>
          </div>
        </div>

        <div style={{ display: "flex", alignItems: "center" }}>
          <div style={{ display: "flex", gap: 16 }}>
            {stats.map((stat) => (
              <div
                key={stat}
                style={{
                  display: "flex",
                  padding: "12px 22px",
                  borderRadius: 2,
                  border: "2px solid rgba(255, 139, 62, 0.45)",
                  background: "rgba(255, 139, 62, 0.08)",
                  color: "#ff8b3e",
                  fontSize: 24,
                  fontWeight: 600,
                }}
              >
                {stat}
              </div>
            ))}
          </div>
        </div>
      </div>
    ),
    size,
  );
}
