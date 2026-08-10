import { readFile } from "fs/promises";
import path from "path";
import { ImageResponse } from "next/og";
import type { MilestoneShareCard } from "@/lib/share/milestone-caption";
import { MILESTONE_LOGO_PATH } from "@/lib/share/milestone-caption";

const WIDTH = 1080;
const HEIGHT = 1350;

async function logoDataUrl(): Promise<string> {
  const filePath = path.join(
    process.cwd(),
    "public",
    MILESTONE_LOGO_PATH.replace(/^\//, ""),
  );
  const buf = await readFile(filePath);
  return `data:image/png;base64,${buf.toString("base64")}`;
}

/**
 * Server-rendered branded milestone card (no user photo storage).
 * Embeds the official logo from public/branding.
 */
export async function renderMilestoneCardPng(
  card: MilestoneShareCard,
): Promise<Buffer> {
  const logoUrl = await logoDataUrl();
  const response = new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          padding: 72,
          background:
            "linear-gradient(160deg, #1a1410 0%, #3d2a1f 45%, #e85d04 120%)",
          color: "#fff8f0",
          fontFamily: "sans-serif",
        }}
      >
        <div style={{ display: "flex", alignItems: "center" }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={logoUrl}
            width={220}
            height={72}
            alt="Vitality Sweat"
            style={{ objectFit: "contain" }}
          />
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 28 }}>
          <div
            style={{
              fontSize: 28,
              letterSpacing: 4,
              textTransform: "uppercase",
              opacity: 0.85,
              fontWeight: 700,
            }}
          >
            Milestone
          </div>
          <div
            style={{
              fontSize: 72,
              lineHeight: 1.05,
              fontWeight: 800,
              maxWidth: 900,
            }}
          >
            {card.headline}
          </div>
          <div
            style={{
              fontSize: 36,
              lineHeight: 1.35,
              opacity: 0.92,
              maxWidth: 900,
            }}
          >
            {card.detail}
          </div>
        </div>
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: 8,
            borderTop: "2px solid rgba(255,248,240,0.35)",
            paddingTop: 28,
          }}
        >
          <div style={{ fontSize: 40, fontWeight: 800 }}>{card.brand}</div>
          <div style={{ fontSize: 26, opacity: 0.8 }}>
            Train free. Share the work.
          </div>
        </div>
      </div>
    ),
    { width: WIDTH, height: HEIGHT },
  );

  return Buffer.from(await response.arrayBuffer());
}

export function pngBufferToDataUrl(buf: Buffer): string {
  return `data:image/png;base64,${buf.toString("base64")}`;
}
