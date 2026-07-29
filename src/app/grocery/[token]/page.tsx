import type { Metadata } from "next";
import { notFound } from "next/navigation";
import GroceryShareClientActions from "@/components/app/GroceryShareClientActions";
import type { GroceryItem } from "@/lib/fitness/types";
import { createServiceRoleClient } from "@/utils/supabase/admin";

export const metadata: Metadata = {
  title: "Grocery list",
  robots: { index: false, follow: false },
};

type PageProps = {
  params: Promise<{ token: string }>;
};

export default async function SharedGroceryPage({ params }: PageProps) {
  const { token } = await params;
  if (
    !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
      token,
    )
  ) {
    notFound();
  }

  const admin = createServiceRoleClient();
  if (!admin) notFound();

  const { data } = await admin
    .from("meal_plans")
    .select("week_start, grocery_list")
    .eq("grocery_share_token", token)
    .maybeSingle();

  if (!data) notFound();

  const grocery = Array.isArray(data.grocery_list)
    ? (data.grocery_list as GroceryItem[])
    : [];

  return (
    <main className="min-h-full bg-surface px-4 py-10 print:bg-white print:px-0 print:py-4">
      <div className="mx-auto w-full max-w-xl">
        <p className="font-sans text-xs font-bold uppercase tracking-[0.14em] text-brand-orange print:text-black">
          Vitality Sweat
        </p>
        <h1 className="mt-2 font-display text-3xl text-brand-ink print:text-black">
          Grocery list
        </h1>
        <p className="mt-2 font-sans text-sm text-brand-muted print:text-black">
          Week of {data.week_start}
        </p>

        <div className="mt-6 print:hidden">
          <GroceryShareClientActions />
        </div>

        {grocery.length === 0 ? (
          <p className="mt-8 font-sans text-sm text-brand-muted">
            This list is empty.
          </p>
        ) : (
          <ul className="mt-8 divide-y divide-brand-ink/10 border border-brand-ink/10 bg-surface-elevated print:border-black print:bg-white">
            {grocery.map((item, idx) => (
              <li
                key={`${item.name}-${idx}`}
                className="flex flex-wrap items-center justify-between gap-2 px-4 py-3 font-sans text-sm"
              >
                <span className="font-semibold text-brand-ink print:text-black">
                  {item.name}
                </span>
                <span className="text-brand-muted print:text-black">
                  {[item.quantity, item.aisle].filter(Boolean).join(" · ")}
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </main>
  );
}
