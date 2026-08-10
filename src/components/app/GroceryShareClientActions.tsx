"use client";

import { useState } from "react";
import SignupCtaLink from "@/components/marketing/SignupCtaLink";

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
    <div className="space-y-3">
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
      <p className="font-sans text-xs leading-relaxed text-brand-muted">
        Shopping together? Pass this list along — then{" "}
        <SignupCtaLink
          location="grocery_share_inline"
          className="font-semibold text-brand-orange underline-offset-2 hover:underline"
        >
          create a free account
        </SignupCtaLink>{" "}
        to build your own plans and invite friends.
      </p>
    </div>
  );
}
