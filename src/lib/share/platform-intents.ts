/** Open-in-app / intent URLs for personal social. No silent auto-post. */

export function twitterIntentUrl(text: string, url?: string | null): string {
  const params = new URLSearchParams();
  params.set("text", text);
  if (url) params.set("url", url);
  return `https://twitter.com/intent/tweet?${params.toString()}`;
}

export function facebookSharerUrl(url: string): string {
  const params = new URLSearchParams();
  params.set("u", url);
  return `https://www.facebook.com/sharer/sharer.php?${params.toString()}`;
}

export function instagramAppUrl(): string {
  return "instagram://app";
}

export async function dataUrlToFile(
  dataUrl: string,
  filename: string,
): Promise<File> {
  const res = await fetch(dataUrl);
  const blob = await res.blob();
  return new File([blob], filename, { type: blob.type || "image/png" });
}

export function downloadDataUrl(dataUrl: string, filename: string): void {
  const a = document.createElement("a");
  a.href = dataUrl;
  a.download = filename;
  a.click();
}

export function openExternal(url: string): void {
  window.open(url, "_blank", "noopener,noreferrer");
}
