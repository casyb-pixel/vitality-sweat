import type { Metadata } from "next";
import { redirect } from "next/navigation";
import LegalDocument from "@/components/legal/LegalDocument";
import TermsAcceptForm from "@/components/legal/TermsAcceptForm";
import { hasAcceptedCurrentTerms } from "@/lib/auth/member-profile";
import { requireMemberAccess } from "@/lib/auth/member";
import { TERMS_PAGE } from "@/lib/legal/terms-2026-08-14";
import { createClient } from "@/utils/supabase/server";

export const metadata: Metadata = {
  title: "Accept Terms of Use",
  robots: { index: false, follow: false },
};

export default async function AcceptTermsPage() {
  const { user } = await requireMemberAccess("/app/legal/accept");
  const supabase = await createClient();
  const { data: profile } = await supabase
    .from("profiles")
    .select("terms_version, terms_accepted_at")
    .eq("id", user.id)
    .maybeSingle();

  if (hasAcceptedCurrentTerms(profile)) {
    redirect("/app");
  }

  const page = TERMS_PAGE;

  return (
    <div className="space-y-2">
      <p className="eyebrow text-brand-orange">Required</p>
      <p className="max-w-2xl font-sans text-sm leading-relaxed text-brand-muted">
        Scroll the Terms of Use and Release of Liability, then check the box to
        continue. You cannot use Workout, Fuel, or The Engine Room until you
        agree.
      </p>
      <div className="max-h-[55vh] overflow-y-auto border border-brand-ink/10 bg-surface-elevated px-4 py-6 sm:px-6">
        <LegalDocument page={page} />
      </div>
      <TermsAcceptForm />
    </div>
  );
}
