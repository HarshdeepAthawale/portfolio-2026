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
          background: "#f6f3ee",
          color: "#1c1917",
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
              border: "6px solid #ffffff",
              boxShadow: "0 12px 32px rgba(28, 25, 23, 0.18)",
            }}
          />
          <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            <div style={{ fontSize: 76, fontWeight: 700, letterSpacing: -2, lineHeight: 1 }}>
              Harshdeep Athawale
            </div>
            <div style={{ fontSize: 40, fontWeight: 600, color: "#c2410c" }}>
              Security Researcher/Engineer
            </div>
            <div style={{ fontSize: 26, color: "#57534e", marginTop: 6 }}>
              Red Bull · Netflix · Goldman Sachs · Adobe · NVIDIA · Anduril
            </div>
            <div style={{ fontSize: 26, color: "#a8a29e", marginTop: 18 }}>
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
                  borderRadius: 9999,
                  border: "2px solid #fed7aa",
                  background: "#ffedd5",
                  color: "#9a3412",
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
