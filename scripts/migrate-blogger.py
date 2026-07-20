"""
Migrate Vitality Sweat Blogger archive → structured posts + local images.
"""
from __future__ import annotations

import json
import re
import time
import urllib.request
from html.parser import HTMLParser
from pathlib import Path
from urllib.parse import urlparse, unquote

ROOT = Path(r"c:\Vitality_Engine_APP")
OUT_IMG = ROOT / "public" / "images" / "blog" / "blogger"
OUT_JSON = ROOT / "public" / "json" / "blogger-migration.json"
OUT_DATA = ROOT / "src" / "data" / "posts.ts"
OUT_IMG.mkdir(parents=True, exist_ok=True)

FEED_URL = (
    "https://vitalitysweat.blogspot.com/feeds/posts/default"
    "?max-results=500&alt=json"
)
UA = (
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
    "AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36"
)


def fetch(url: str, binary: bool = False):
    req = urllib.request.Request(url, headers={"User-Agent": UA})
    with urllib.request.urlopen(req, timeout=60) as resp:
        data = resp.read()
        if binary:
            return data, resp.headers.get_content_type()
        return data.decode("utf-8", errors="ignore"), resp.headers.get_content_type()


def slugify(text: str) -> str:
    text = text.lower().strip()
    text = re.sub(r"[^a-z0-9\s-]", "", text)
    text = re.sub(r"[\s_]+", "-", text)
    text = re.sub(r"-{2,}", "-", text).strip("-")
    return text[:80] or "post"


class ArticleParser(HTMLParser):
    def __init__(self):
        super().__init__()
        self.in_title = False
        self.title = ""
        self.in_date = False
        self.date_text = ""
        self.capture = False
        self.depth = 0
        self.blocks: list[dict] = []
        self._buf = ""
        self._tag = None
        self.images: list[dict] = []
        self._skip = False

    def handle_starttag(self, tag, attrs):
        attrs_d = dict(attrs)
        cls = attrs_d.get("class", "")
        if tag == "h3" and "post-title" in cls:
            self.in_title = True
            self._buf = ""
        if tag in {"abbr", "time"} and (
            "published" in cls or attrs_d.get("itemprop") == "datePublished"
        ):
            self.in_date = True
            self._buf = ""
            if attrs_d.get("title"):
                self.date_text = attrs_d["title"]
            if attrs_d.get("datetime"):
                self.date_text = attrs_d["datetime"]

        if tag == "div" and "post-body" in cls:
            self.capture = True
            self.depth = 1
            return

        if not self.capture:
            return

        if tag == "div":
            self.depth += 1

        if tag in {"script", "style", "iframe"}:
            self._skip = True
            return

        if tag in {"h1", "h2", "h3", "h4", "p", "li"}:
            self._flush()
            self._tag = tag
            self._buf = ""
        elif tag == "br":
            self._buf += "\n"
        elif tag == "img":
            src = (
                attrs_d.get("src")
                or attrs_d.get("data-src")
                or attrs_d.get("data-original")
            )
            if src and src.startswith("http"):
                # Prefer larger blogger image if /s###/ present
                src = re.sub(r"/s\d+(-c)?/", "/s1600/", src)
                alt = attrs_d.get("alt") or ""
                self.images.append({"src": src, "alt": alt})
                self.blocks.append({"type": "image", "src": src, "alt": alt})

    def handle_endtag(self, tag):
        if self.in_title and tag == "h3":
            self.title = re.sub(r"\s+", " ", self._buf).strip()
            self.in_title = False
            self._buf = ""
        if self.in_date and tag in {"abbr", "time", "a", "span"}:
            if not self.date_text:
                self.date_text = re.sub(r"\s+", " ", self._buf).strip()
            self.in_date = False
            self._buf = ""

        if not self.capture:
            return

        if tag in {"script", "style", "iframe"}:
            self._skip = False
            return

        if tag in {"h1", "h2", "h3", "h4", "p", "li"}:
            text = re.sub(r"\s+", " ", self._buf).strip()
            if text:
                if tag in {"h1", "h2"}:
                    self.blocks.append({"type": "h2", "text": text})
                elif tag in {"h3", "h4"}:
                    self.blocks.append({"type": "h3", "text": text})
                elif tag == "li":
                    # collect contiguous list items later
                    self.blocks.append({"type": "li", "text": text})
                else:
                    self.blocks.append({"type": "p", "text": text})
            self._tag = None
            self._buf = ""

        if tag == "div" and self.capture:
            self.depth -= 1
            if self.depth <= 0:
                self.capture = False

    def handle_data(self, data):
        if self._skip:
            return
        if self.in_title or self.in_date or (self.capture and self._tag):
            self._buf += data

    def _flush(self):
        pass


def merge_lists(blocks: list[dict]) -> list[dict]:
    out: list[dict] = []
    buf: list[str] = []
    for b in blocks:
        if b["type"] == "li":
            buf.append(b["text"])
            continue
        if buf:
            out.append({"type": "ul", "items": buf})
            buf = []
        out.append(b)
    if buf:
        out.append({"type": "ul", "items": buf})
    return out


def excerpt_from_blocks(blocks: list[dict], limit: int = 180) -> str:
    for b in blocks:
        if b["type"] == "p":
            t = b["text"]
            return t if len(t) <= limit else t[: limit - 1].rsplit(" ", 1)[0] + "…"
    return ""


def download_image(url: str, slug: str, index: int) -> dict:
    ext = Path(urlparse(url).path).suffix.lower()
    if ext not in {".png", ".jpg", ".jpeg", ".webp", ".gif"}:
        ext = ".png"
    # descriptive name
    stem = Path(unquote(urlparse(url).path)).stem
    stem = slugify(stem)[:40] or f"graphic-{index+1}"
    filename = f"{slug}-{stem}{ext}" if not stem.startswith(slug) else f"{stem}{ext}"
    # ensure uniqueness
    filename = f"{slug}-{index+1:02d}-{stem}{ext}"
    dest = OUT_IMG / filename
    meta = {
        "originalUrl": url,
        "localPath": None,
        "filename": filename,
        "downloaded": False,
        "error": None,
    }
    try:
        data, ctype = fetch(url, binary=True)
        if "image" not in (ctype or "") and not data[:8]:
            raise RuntimeError(f"unexpected content-type {ctype}")
        # sniff
        if data.startswith(b"\x89PNG"):
            dest = dest.with_suffix(".png")
            meta["filename"] = dest.name
        elif data[:3] == b"\xff\xd8\xff":
            dest = dest.with_suffix(".jpg")
            meta["filename"] = dest.name
        elif data[:4] == b"RIFF":
            dest = dest.with_suffix(".webp")
            meta["filename"] = dest.name
        dest.write_bytes(data)
        meta["localPath"] = f"/images/blog/blogger/{dest.name}"
        meta["downloaded"] = True
        print(f"  IMG OK {dest.name} ({len(data)} bytes)")
    except Exception as exc:  # noqa: BLE001
        meta["error"] = str(exc)
        print(f"  IMG FAIL {url} :: {exc}")
    return meta


def js_string(value: str) -> str:
    return json.dumps(value, ensure_ascii=False)


def emit_ts(posts: list[dict]) -> str:
    lines = [
        "/**",
        " * Migrated Sweatlife Chronicles posts from vitalitysweat.blogspot.com",
        " * Generated by migration scrape — do not hand-edit bulk content lightly.",
        " */",
        "",
        "export type BlogBlock =",
        '  | { type: "p"; text: string }',
        '  | { type: "h2"; text: string }',
        '  | { type: "h3"; text: string }',
        '  | { type: "ul"; items: string[] }',
        '  | { type: "image"; src: string; alt: string };',
        "",
        "export type MigratedPost = {",
        "  slug: string;",
        "  title: string;",
        "  subtitle?: string;",
        "  description: string;",
        "  keywords: string[];",
        "  author: string;",
        "  datePublished: string;",
        "  dateModified: string;",
        "  ogImage: string;",
        "  coverImage: string;",
        "  coverAlt: string;",
        "  excerpt: string;",
        "  featured?: boolean;",
        "  sourceUrl?: string;",
        "  body: BlogBlock[];",
        "};",
        "",
        "export const MIGRATED_POSTS: MigratedPost[] = [",
    ]

    for post in posts:
        lines.append("  {")
        lines.append(f"    slug: {js_string(post['slug'])},")
        lines.append(f"    title: {js_string(post['title'])},")
        if post.get("subtitle"):
            lines.append(f"    subtitle: {js_string(post['subtitle'])},")
        lines.append(f"    description: {js_string(post['description'])},")
        lines.append(
            "    keywords: ["
            + ", ".join(js_string(k) for k in post["keywords"])
            + "],"
        )
        lines.append(f"    author: {js_string(post['author'])},")
        lines.append(f"    datePublished: {js_string(post['datePublished'])},")
        lines.append(f"    dateModified: {js_string(post['dateModified'])},")
        lines.append(f"    ogImage: {js_string(post['ogImage'])},")
        lines.append(f"    coverImage: {js_string(post['coverImage'])},")
        lines.append(f"    coverAlt: {js_string(post['coverAlt'])},")
        lines.append(f"    excerpt: {js_string(post['excerpt'])},")
        if post.get("featured"):
            lines.append("    featured: true,")
        if post.get("sourceUrl"):
            lines.append(f"    sourceUrl: {js_string(post['sourceUrl'])},")
        lines.append("    body: [")
        for block in post["body"]:
            if block["type"] == "ul":
                items = ", ".join(js_string(i) for i in block["items"])
                lines.append(f'      {{ type: "ul", items: [{items}] }},')
            elif block["type"] == "image":
                lines.append(
                    f'      {{ type: "image", src: {js_string(block["src"])}, alt: {js_string(block["alt"])} }},'
                )
            else:
                lines.append(
                    f'      {{ type: {js_string(block["type"])}, text: {js_string(block["text"])} }},'
                )
        lines.append("    ],")
        lines.append("  },")
    lines.append("];")
    lines.append("")
    lines.append("export function getMigratedPostBySlug(slug: string) {")
    lines.append("  return MIGRATED_POSTS.find((p) => p.slug === slug);")
    lines.append("}")
    lines.append("")
    lines.append("export function getAllMigratedPosts() {")
    lines.append("  return MIGRATED_POSTS;")
    lines.append("}")
    lines.append("")
    return "\n".join(lines)


def main() -> None:
    print("Fetching feed…")
    raw, _ = fetch(FEED_URL)
    feed = json.loads(raw)
    entries = feed.get("feed", {}).get("entry", [])
    print(f"Found {len(entries)} posts")

    posts: list[dict] = []
    catalog_images: list[dict] = []

    for i, entry in enumerate(entries):
        title = entry.get("title", {}).get("$t", "").strip()
        published = entry.get("published", {}).get("$t", "")
        updated = entry.get("updated", {}).get("$t", published)
        links = entry.get("link", [])
        url = next((l.get("href") for l in links if l.get("rel") == "alternate"), "")
        if not url:
            continue

        # modern slug from blogger filename without date folder
        path = urlparse(url).path
        blogger_slug = Path(path).stem  # e.g. fuel-engine-of-change-mastering-your
        slug = slugify(blogger_slug)
        print(f"\n[{i+1}/{len(entries)}] {title}\n  {url} -> /blog/{slug}")

        html, _ = fetch(url)
        parser = ArticleParser()
        parser.feed(html)
        blocks = merge_lists(parser.blocks)
        images = parser.images

        # also grab og:image
        og = re.search(
            r'property=["\']og:image["\'][^>]*content=["\']([^"\']+)', html
        ) or re.search(
            r'content=["\']([^"\']+)["\'][^>]*property=["\']og:image', html
        )
        if og:
            og_url = og.group(1)
            if not any(im["src"] == og_url for im in images):
                images.insert(0, {"src": og_url, "alt": title})

        # download images and rewrite block srcs
        url_map: dict[str, str] = {}
        local_images: list[dict] = []
        for idx, im in enumerate(images):
            meta = download_image(im["src"], slug, idx)
            local_images.append(meta)
            catalog_images.append({**meta, "postSlug": slug, "postTitle": title})
            if meta["downloaded"] and meta["localPath"]:
                url_map[im["src"]] = meta["localPath"]
            time.sleep(0.2)

        rewritten: list[dict] = []
        for b in blocks:
            if b["type"] == "image":
                src = url_map.get(b["src"], b["src"])
                rewritten.append({**b, "src": src})
            else:
                rewritten.append(b)

        cover = None
        for meta in local_images:
            if meta.get("downloaded") and meta.get("localPath"):
                cover = meta["localPath"]
                break
        if not cover and images:
            cover = images[0]["src"]
        if not cover:
            cover = "/images/stock/graphics/blog-workout-plan-energy.png"

        # ISO dates
        date_published = published
        if date_published.endswith("Z") is False and re.match(
            r".*[+-]\d{2}:\d{2}$", date_published
        ):
            # keep as-is; JS Date accepts it
            pass

        desc_match = re.search(
            r'name=["\']description["\'][^>]*content=["\']([^"\']+)', html
        )
        description = (
            desc_match.group(1).strip()
            if desc_match
            else excerpt_from_blocks(rewritten, 160)
        )
        excerpt = excerpt_from_blocks(rewritten)

        keywords = [w for w in re.split(r"[^\w]+", title.lower()) if len(w) > 3][:8]
        keywords = list(dict.fromkeys(keywords + ["Sweatlife Chronicles", "Vitality Sweat"]))

        posts.append(
            {
                "slug": slug,
                "title": title or parser.title,
                "description": description,
                "keywords": keywords,
                "author": "Hunter",
                "datePublished": date_published,
                "dateModified": updated,
                "ogImage": cover,
                "coverImage": cover,
                "coverAlt": f"{title} — Sweatlife Chronicles",
                "excerpt": excerpt or description,
                "featured": i == 0,
                "sourceUrl": url,
                "body": rewritten,
                "images": local_images,
            }
        )
        time.sleep(0.35)

    # Sort newest first
    posts.sort(key=lambda p: p["datePublished"], reverse=True)
    if posts:
        for p in posts:
            p["featured"] = False
        posts[0]["featured"] = True

    OUT_JSON.write_text(
        json.dumps(
            {
                "source": "https://vitalitysweat.blogspot.com/",
                "migratedAt": time.strftime("%Y-%m-%d"),
                "postCount": len(posts),
                "imageCatalog": catalog_images,
                "posts": [
                    {
                        "slug": p["slug"],
                        "title": p["title"],
                        "datePublished": p["datePublished"],
                        "sourceUrl": p["sourceUrl"],
                        "route": f"/blog/{p['slug']}",
                        "coverImage": p["coverImage"],
                        "imageCount": len(p.get("images", [])),
                    }
                    for p in posts
                ],
            },
            indent=2,
        ),
        encoding="utf-8",
    )
    OUT_DATA.write_text(emit_ts(posts), encoding="utf-8")
    print(f"\nWrote {OUT_DATA}")
    print(f"Wrote {OUT_JSON}")
    print(f"Posts: {len(posts)}")


if __name__ == "__main__":
    main()
