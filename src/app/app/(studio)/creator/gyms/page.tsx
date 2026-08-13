import type { Metadata } from "next";
import { requireCreatorAccess } from "@/lib/auth/creator";
import { createClient } from "@/utils/supabase/server";

export const metadata: Metadata = {
  title: "Gym OS",
  robots: { index: false, follow: false },
};

export default async function GymOsPage() {
  await requireCreatorAccess();
  const supabase = await createClient();
  const { data: gyms } = await supabase
    .from("gym_locations")
    .select("slug, name, metro, invite_code, monthly_price_cents")
    .eq("is_active", true)
    .order("name");

  return (
    <div className="space-y-6">
      <header>
        <p className="eyebrow text-brand-orange">Gym white-label</p>
        <h1 className="font-display text-3xl text-brand-ink">Location dashboard</h1>
        <p className="mt-2 max-w-2xl font-sans text-sm text-brand-muted">
          QR attribution already lives on /invite?src=gym. This board is the B2B
          shell: signups per code, co-branded Sweat Score later. Logging stays
          free for members.
        </p>
      </header>
      <ul className="space-y-3">
        {(gyms ?? []).length === 0 ? (
          <li className="border border-brand-ink/10 p-4 font-sans text-sm text-brand-muted">
            No gym locations yet. Seed one (example: Red's, invite_code reds) then
            print /invite?src=gym&gym=reds.
          </li>
        ) : (
          (gyms ?? []).map((gym) => (
            <li key={gym.slug} className="border border-brand-ink/10 p-4">
              <p className="font-display text-xl text-brand-ink">{gym.name}</p>
              <p className="font-sans text-sm text-brand-muted">
                {gym.metro} · code {gym.invite_code} · /invite?src=gym&gym=
                {gym.invite_code}
              </p>
            </li>
          ))
        )}
      </ul>
    </div>
  );
}
