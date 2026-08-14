import type { MilestoneShareCard } from "@/lib/share/milestone-caption";
import { MILESTONE_LOGO_PATH } from "@/lib/share/milestone-caption";

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error("Could not load image."));
    img.src = src;
  });
}

function wrapText(
  ctx: CanvasRenderingContext2D,
  text: string,
  x: number,
  y: number,
  maxWidth: number,
  lineHeight: number,
) {
  const words = text.split(/\s+/);
  let line = "";
  let yy = y;
  for (const word of words) {
    const test = line ? `${line} ${word}` : word;
    if (ctx.measureText(test).width > maxWidth && line) {
      ctx.fillText(line, x, yy);
      line = word;
      yy += lineHeight;
    } else {
      line = test;
    }
  }
  if (line) ctx.fillText(line, x, yy);
}

/**
 * Compose a branded share card. Optional member photo is never uploaded.
 */
export async function composeShareCard(input: {
  card: MilestoneShareCard;
  eyebrow?: string;
  photoDataUrl?: string | null;
  serverImage?: string | null;
}): Promise<string> {
  const width = 1080;
  const height = 1350;
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas unavailable.");

  if (input.photoDataUrl) {
    const photo = await loadImage(input.photoDataUrl);
    const scale = Math.max(width / photo.width, height / photo.height);
    const tw = photo.width * scale;
    const th = photo.height * scale;
    ctx.drawImage(photo, (width - tw) / 2, (height - th) / 2, tw, th);
    ctx.fillStyle = "rgba(20, 12, 8, 0.55)";
    ctx.fillRect(0, 0, width, height);
  } else if (input.serverImage) {
    const base = await loadImage(input.serverImage);
    ctx.drawImage(base, 0, 0, width, height);
    return canvas.toDataURL("image/png");
  } else {
    const grad = ctx.createLinearGradient(0, 0, width, height);
    grad.addColorStop(0, "#1a1410");
    grad.addColorStop(0.45, "#3d2a1f");
    grad.addColorStop(1, "#e85d04");
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, width, height);
  }

  try {
    const logo = await loadImage(input.card.logoPath || MILESTONE_LOGO_PATH);
    const logoW = 220;
    const logoH = (logo.height / logo.width) * logoW;
    ctx.drawImage(logo, 72, 64, logoW, logoH);
  } catch {
    // Logo load failed; continue with text branding.
  }

  ctx.fillStyle = "#fff8f0";
  ctx.font = "700 28px system-ui, sans-serif";
  ctx.fillText((input.eyebrow ?? "SHARE").toUpperCase(), 72, 220);

  ctx.font = "800 64px system-ui, sans-serif";
  wrapText(ctx, input.card.headline, 72, 320, width - 144, 72);

  ctx.font = "400 34px system-ui, sans-serif";
  wrapText(ctx, input.card.detail, 72, 520, width - 144, 44);

  ctx.fillStyle = "rgba(255,248,240,0.35)";
  ctx.fillRect(72, height - 220, width - 144, 2);
  ctx.fillStyle = "#fff8f0";
  ctx.font = "800 40px system-ui, sans-serif";
  ctx.fillText(input.card.brand || "Vitality Engine", 72, height - 150);
  ctx.font = "400 26px system-ui, sans-serif";
  ctx.fillText("Train free. Share the work.", 72, height - 100);

  return canvas.toDataURL("image/png");
}
