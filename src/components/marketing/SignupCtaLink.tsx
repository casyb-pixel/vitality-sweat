"use client";

import Link from "next/link";
import { trackCtaClick, signupHref } from "@/lib/analytics/ga";

type SignupCtaLinkProps = {
  location: string;
  label?: string;
  href?: string;
  nextPath?: string;
  className?: string;
  children: React.ReactNode;
  onNavigate?: () => void;
};

/**
 * Marketing CTA that opens Create free account (`?auth=signup`) and emits cta_click.
 */
export default function SignupCtaLink({
  location,
  label,
  href,
  nextPath = "/app",
  className,
  children,
  onNavigate,
}: SignupCtaLinkProps) {
  const target = href ?? signupHref(nextPath);
  const resolvedLabel =
    label ?? (typeof children === "string" ? children : "Create free account");

  return (
    <Link
      href={target}
      className={className}
      onClick={() => {
        trackCtaClick(location, resolvedLabel);
        onNavigate?.();
      }}
    >
      {children}
    </Link>
  );
}
