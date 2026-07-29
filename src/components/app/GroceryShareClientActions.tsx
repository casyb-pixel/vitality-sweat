"use client";

import { useState } from "react";

export default function GroceryShareClientActions() {
  const [copied, setCopied] = useState(false);

  async function copyLink() {
    try {
      await navigator.clipboard.writeText(window.location.href);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopied(false);
    }
  }

  return (
    <div className="flex flex-wrap gap-2">
      <button
        type="button"
        onClick={() => window.print()}
        className="inline-flex min-h-10 items-center justify-center bg-brand-orange px-4 py-2 font-sans text-xs font-bold uppercase tracking-[0.08em] text-white hover:bg-brand-orange-deep"
      >
        Print list
      </button>
      <button
        type="button"
        onClick={() => void copyLink()}
        className="inline-flex min-h-10 items-center justify-center border border-brand-ink/15 px-4 py-2 font-sans text-xs font-bold uppercase tracking-[0.08em] text-brand-ink hover:border-brand-orange hover:text-brand-orange"
      >
        {copied ? "Link copied" : "Copy share link"}
      </button>
    </div>
  );
}
