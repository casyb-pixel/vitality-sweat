import type { Metadata } from "next";
import ScholarshipDesk from "@/components/scholarships/ScholarshipDesk";
import { requireScholarshipAccess } from "@/lib/auth/scholarship";
import { loadScholarshipDesk } from "@/lib/scholarships/load";
import { createClient } from "@/utils/supabase/server";

export const metadata: Metadata = {
  title: "Scholarships",
  robots: { index: false, follow: false },
};

export default async function ScholarshipsPage() {
  await requireScholarshipAccess();
  const supabase = await createClient();

  try {
    const desk = await loadScholarshipDesk(supabase);
    return <ScholarshipDesk initial={desk} />;
  } catch (error) {
    const message = error instanceof Error ? error.message : "Could not load scholarships.";
    return (
      <div className="py-10">
        <h1 className="font-display text-3xl text-brand-ink">Scholarships</h1>
        <p className="mt-3 max-w-xl font-sans text-sm text-brand-muted">{message}</p>
      </div>
    );
  }
}
