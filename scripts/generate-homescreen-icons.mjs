import fs from "node:fs";
import path from "node:path";
import sharp from "sharp";

const src = fs.readFileSync(
  "public/branding/logo-original-transparent.svg",
  "utf8",
);
const paths = [...src.matchAll(/<path\b[^>]*\/>/g)].map((m) => m[0]);
const emblem = paths.filter((p) => !p.includes('id="text"'));
if (emblem.length < 4) {
  console.error("expected 4 emblem paths, got", emblem.length);
  process.exit(1);
}

const iconSvg = `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="512" height="512" viewBox="0 0 512 512">
  <rect width="512" height="512" fill="#000000"/>
  <svg x="72" y="72" width="368" height="368" viewBox="148 418 164 164" preserveAspectRatio="xMidYMid meet">
    ${emblem.join("\n    ")}
  </svg>
</svg>`;

const outDir = "public/branding/app";
fs.mkdirSync(outDir, { recursive: true });
fs.writeFileSync(path.join(outDir, "icon-mark.svg"), iconSvg);

async function writePng(name, size) {
  await sharp(Buffer.from(iconSvg)).resize(size, size).png().toFile(path.join(outDir, name));
  console.log("wrote", name, size);
}

await writePng("icon-192.png", 192);
await writePng("icon-512.png", 512);
await writePng("apple-touch-icon.png", 180);
