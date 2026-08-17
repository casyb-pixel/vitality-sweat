"use client";

import { useState } from "react";
import {
  SOCIAL_KIT_BIOS,
  SOCIAL_KIT_LOGOS,
  SOCIAL_KIT_RULES,
  SOCIAL_KIT_UTM_LINKS,
  SOCIAL_KIT_WEEKLY_CADENCE,
} from "@/lib/marketing/social-kit";

export default function SocialKitPanel() {
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  async function copyText(key: string, text: string) {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedKey(key);
      window.setTimeout(() => setCopiedKey(null), 2000);
    } catch {
      setCopiedKey(null);
    }
  }

  return (
    <div className="space-y-6">
      <section className="border border-brand-ink/10 bg-surface-elevated px-4 py-5 sm:px-5">
        <p className="eyebrow text-brand-orange">This week</p>
        <h2 className="mt-1 font-display text-xl text-brand-ink">
          Three posts. One film.
        </h2>
        <p className="mt-2 max-w-2xl font-sans text-sm leading-relaxed text-brand-muted">
          Matches the school-day task cap. Paste bios once, then run this
          cadence every week from Video Studio.
        </p>
        <ol className="mt-5 space-y-3">
          {SOCIAL_KIT_WEEKLY_CADENCE.map((item) => (
            <li
              key={item.id}
              className="border border-brand-ink/10 bg-surface px-4 py-3"
            >
              <p className="font-sans text-sm font-semibold text-brand-ink">
                {item.title}
              </p>
              <p className="mt-1 font-sans text-xs font-bold uppercase tracking-[0.08em] text-brand-orange">
                {item.where}
              </p>
              <p className="mt-1 font-sans text-sm leading-relaxed text-brand-muted">
                {item.how}
              </p>
            </li>
          ))}
        </ol>
        <ul className="mt-5 space-y-1.5">
          {SOCIAL_KIT_RULES.map((rule) => (
            <li
              key={rule}
              className="font-sans text-sm leading-relaxed text-brand-muted"
            >
              {rule}
            </li>
          ))}
        </ul>
      </section>

      <section className="border border-brand-ink/10 bg-surface-elevated px-4 py-5 sm:px-5">
        <h2 className="font-display text-xl text-brand-ink">Bios to paste</h2>
        <p className="mt-1 font-sans text-sm text-brand-muted">
          Fix Instagram, X, YouTube, Facebook, and TikTok in the native apps.
          Cursor cannot log into those accounts for you.
        </p>
        <div className="mt-4 space-y-4">
          {SOCIAL_KIT_BIOS.map((bio) => (
            <article
              key={bio.platform}
              className="border border-brand-ink/10 bg-surface px-4 py-4"
            >
              <div className="flex flex-wrap items-center justify-between gap-2">
                <h3 className="font-display text-lg text-brand-ink">
                  {bio.label}
                </h3>
                <a
                  href={bio.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="font-sans text-xs font-bold uppercase tracking-[0.08em] text-brand-orange hover:text-brand-orange-deep"
                >
                  Open {bio.label}
                </a>
              </div>
              <p className="mt-1 font-sans text-sm text-brand-muted">
                Name: {bio.displayName} · {bio.handle}
              </p>
              <pre className="mt-3 whitespace-pre-wrap font-sans text-sm leading-relaxed text-brand-ink">
                {bio.bio}
              </pre>
              {bio.extra ? (
                <p className="mt-2 font-sans text-xs leading-relaxed text-brand-muted">
                  {bio.extra}
                </p>
              ) : null}
              <button
                type="button"
                onClick={() => void copyText(`bio-${bio.platform}`, bio.bio)}
                className="mt-3 inline-flex min-h-11 items-center bg-brand-orange px-4 py-2 font-sans text-xs font-bold uppercase tracking-[0.08em] text-white hover:bg-brand-orange-deep"
              >
                {copiedKey === `bio-${bio.platform}` ? "Copied" : "Copy bio"}
              </button>
            </article>
          ))}
        </div>
      </section>

      <section className="border border-brand-ink/10 bg-surface-elevated px-4 py-5 sm:px-5">
        <h2 className="font-display text-xl text-brand-ink">UTM invite links</h2>
        <p className="mt-1 font-sans text-sm text-brand-muted">
          Use the matching source so signups land with campaign metadata.
        </p>
        <ul className="mt-4 space-y-3">
          {SOCIAL_KIT_UTM_LINKS.map((item) => (
            <li
              key={item.platform}
              className="flex flex-col gap-2 border border-brand-ink/10 bg-surface px-4 py-3 sm:flex-row sm:items-center sm:justify-between"
            >
              <div className="min-w-0">
                <p className="font-sans text-sm font-semibold text-brand-ink">
                  {item.label}
                </p>
                <p className="mt-1 break-all font-sans text-xs text-brand-muted">
                  {item.url}
                </p>
              </div>
              <button
                type="button"
                onClick={() => void copyText(`utm-${item.platform}`, item.url)}
                className="inline-flex min-h-11 shrink-0 items-center border border-brand-ink/15 px-4 py-2 font-sans text-xs font-bold uppercase tracking-[0.08em] text-brand-ink hover:border-brand-orange"
              >
                {copiedKey === `utm-${item.platform}` ? "Copied" : "Copy link"}
              </button>
            </li>
          ))}
        </ul>
      </section>

      <section className="border border-brand-ink/10 bg-surface-elevated px-4 py-5 sm:px-5">
        <h2 className="font-display text-xl text-brand-ink">Logo files</h2>
        <p className="mt-1 font-sans text-sm text-brand-muted">
          Official marks only. Do not invent a new icon.
        </p>
        <ul className="mt-4 grid gap-2 sm:grid-cols-2">
          {SOCIAL_KIT_LOGOS.map((logo) => (
            <li key={logo.href}>
              <a
                href={logo.href}
                target="_blank"
                rel="noopener noreferrer"
                className="block border border-brand-ink/10 bg-surface px-4 py-3 font-sans text-sm font-semibold text-brand-ink hover:border-brand-orange"
              >
                {logo.label}
              </a>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
