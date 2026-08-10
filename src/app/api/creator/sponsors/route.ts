import { NextResponse } from "next/server";
import { resolveAccessDecision } from "@/lib/auth/authorize";
import { slugifySponsorName } from "@/lib/sponsors/serve";
import { SPONSOR_SLOTS, isKnownSponsorSlot } from "@/lib/sponsors/slots";
import { createServiceRoleClient } from "@/utils/supabase/admin";
import { createClient } from "@/utils/supabase/server";

export const runtime = "nodejs";

async function requireCreatorAdmin() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const access = await resolveAccessDecision(supabase, user);
  if (access.status !== "creator") {
    return { error: NextResponse.json({ ok: false, error: "Unauthorized." }, { status: 401 }) };
  }
  const admin = createServiceRoleClient();
  if (!admin) {
    return {
      error: NextResponse.json(
        { ok: false, error: "Service role unavailable." },
        { status: 500 },
      ),
    };
  }
  return { admin };
}

/** List sponsors + campaigns + creatives + slot registry. */
export async function GET() {
  const gate = await requireCreatorAdmin();
  if ("error" in gate) return gate.error;
  const { admin } = gate;

  const { data: sponsors, error } = await admin
    .from("sponsors")
    .select(
      `
      id, name, slug, logo_url, website_url, contact_email, notes, is_active, created_at, updated_at,
      sponsor_campaigns (
        id, name, status, starts_at, ends_at, target_zips, target_markets, notes, is_house, created_at, updated_at,
        sponsor_creatives (
          id, slot_id, headline, body, image_url, click_url, cta_label, priority, is_active, created_at
        )
      )
    `,
    )
    .order("created_at", { ascending: false });

  if (error) {
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  }

  return NextResponse.json({
    ok: true,
    slots: SPONSOR_SLOTS,
    sponsors: sponsors ?? [],
  });
}

/**
 * Unified write API:
 * action: create_sponsor | update_sponsor | create_campaign | update_campaign | upsert_creative | delete_creative
 */
export async function POST(request: Request) {
  const gate = await requireCreatorAdmin();
  if ("error" in gate) return gate.error;
  const { admin } = gate;

  let body: Record<string, unknown>;
  try {
    body = (await request.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ ok: false, error: "Invalid JSON." }, { status: 400 });
  }

  const action = String(body.action ?? "");

  try {
    if (action === "create_sponsor") {
      const name = String(body.name ?? "").trim();
      if (!name) {
        return NextResponse.json({ ok: false, error: "Name required." }, { status: 400 });
      }
      const slug =
        String(body.slug ?? "").trim() || slugifySponsorName(name);
      const { data, error } = await admin
        .from("sponsors")
        .insert({
          name,
          slug,
          logo_url: (body.logo_url as string) || null,
          website_url: (body.website_url as string) || null,
          contact_email: (body.contact_email as string) || null,
          notes: (body.notes as string) || null,
          is_active: body.is_active !== false,
        })
        .select("*")
        .single();
      if (error) {
        return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
      }
      return NextResponse.json({ ok: true, sponsor: data });
    }

    if (action === "update_sponsor") {
      const id = String(body.id ?? "");
      if (!id) {
        return NextResponse.json({ ok: false, error: "id required." }, { status: 400 });
      }
      const patch: Record<string, unknown> = {
        updated_at: new Date().toISOString(),
      };
      for (const key of [
        "name",
        "slug",
        "logo_url",
        "website_url",
        "contact_email",
        "notes",
        "is_active",
      ]) {
        if (key in body) patch[key] = body[key];
      }
      const { data, error } = await admin
        .from("sponsors")
        .update(patch)
        .eq("id", id)
        .select("*")
        .single();
      if (error) {
        return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
      }
      return NextResponse.json({ ok: true, sponsor: data });
    }

    if (action === "create_campaign") {
      const sponsorId = String(body.sponsor_id ?? "");
      const name = String(body.name ?? "").trim();
      if (!sponsorId || !name) {
        return NextResponse.json(
          { ok: false, error: "sponsor_id and name required." },
          { status: 400 },
        );
      }
      const zips = Array.isArray(body.target_zips)
        ? (body.target_zips as string[])
            .map((z) => String(z).replace(/\D/g, "").slice(0, 5))
            .filter((z) => z.length === 5)
        : String(body.target_zips_text ?? "")
            .split(/[,\s]+/)
            .map((z) => z.replace(/\D/g, "").slice(0, 5))
            .filter((z) => z.length === 5);

      const { normalizeMarketParam, zipsForMarkets } = await import(
        "@/lib/markets/metros"
      );
      const marketsRaw = Array.isArray(body.target_markets)
        ? (body.target_markets as string[])
        : String(body.target_market ?? body.market ?? "")
            .split(/[,\s]+/)
            .filter(Boolean);
      const markets = marketsRaw
        .map((m) => normalizeMarketParam(m))
        .filter((m): m is NonNullable<typeof m> => Boolean(m));
      const resolvedZips =
        zips.length > 0
          ? zips
          : markets.length
            ? zipsForMarkets(markets)
            : [];

      const { data, error } = await admin
        .from("sponsor_campaigns")
        .insert({
          sponsor_id: sponsorId,
          name,
          status: (body.status as string) || "draft",
          starts_at: (body.starts_at as string) || null,
          ends_at: (body.ends_at as string) || null,
          target_zips: resolvedZips,
          target_markets: markets,
          notes: (body.notes as string) || null,
          is_house: body.is_house === true,
        })
        .select("*")
        .single();
      if (error) {
        return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
      }
      return NextResponse.json({ ok: true, campaign: data });
    }

    if (action === "update_campaign") {
      const id = String(body.id ?? "");
      if (!id) {
        return NextResponse.json({ ok: false, error: "id required." }, { status: 400 });
      }
      const patch: Record<string, unknown> = {
        updated_at: new Date().toISOString(),
      };
      for (const key of [
        "name",
        "status",
        "starts_at",
        "ends_at",
        "notes",
        "is_house",
      ]) {
        if (key in body) patch[key] = body[key];
      }
      if ("target_zips" in body || "target_zips_text" in body) {
        const zips = Array.isArray(body.target_zips)
          ? (body.target_zips as string[])
              .map((z) => String(z).replace(/\D/g, "").slice(0, 5))
              .filter((z) => z.length === 5)
          : String(body.target_zips_text ?? "")
              .split(/[,\s]+/)
              .map((z) => z.replace(/\D/g, "").slice(0, 5))
              .filter((z) => z.length === 5);
        patch.target_zips = zips;
      }
      const { data, error } = await admin
        .from("sponsor_campaigns")
        .update(patch)
        .eq("id", id)
        .select("*")
        .single();
      if (error) {
        return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
      }
      return NextResponse.json({ ok: true, campaign: data });
    }

    if (action === "upsert_creative") {
      const campaignId = String(body.campaign_id ?? "");
      const slotId = String(body.slot_id ?? "").trim();
      const headline = String(body.headline ?? "").trim();
      const clickUrl = String(body.click_url ?? "").trim();
      if (!campaignId || !slotId || !headline || !clickUrl) {
        return NextResponse.json(
          {
            ok: false,
            error: "campaign_id, slot_id, headline, and click_url required.",
          },
          { status: 400 },
        );
      }
      if (!isKnownSponsorSlot(slotId) && !slotId.startsWith("blog-mid-")) {
        // Allow known registry + blog-mid aliases; blog-inline preferred.
      }
      const payload = {
        campaign_id: campaignId,
        slot_id: slotId.startsWith("blog-mid-") ? "blog-inline" : slotId,
        headline,
        body: (body.body as string) || null,
        image_url: (body.image_url as string) || null,
        click_url: clickUrl,
        cta_label: (body.cta_label as string) || "Learn more",
        priority: Number(body.priority ?? 100),
        is_active: body.is_active !== false,
        updated_at: new Date().toISOString(),
      };

      if (body.id) {
        const { data, error } = await admin
          .from("sponsor_creatives")
          .update(payload)
          .eq("id", String(body.id))
          .select("*")
          .single();
        if (error) {
          return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
        }
        return NextResponse.json({ ok: true, creative: data });
      }

      const { data, error } = await admin
        .from("sponsor_creatives")
        .insert(payload)
        .select("*")
        .single();
      if (error) {
        return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
      }
      return NextResponse.json({ ok: true, creative: data });
    }

    if (action === "delete_creative") {
      const id = String(body.id ?? "");
      if (!id) {
        return NextResponse.json({ ok: false, error: "id required." }, { status: 400 });
      }
      const { error } = await admin.from("sponsor_creatives").delete().eq("id", id);
      if (error) {
        return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
      }
      return NextResponse.json({ ok: true });
    }

    return NextResponse.json(
      { ok: false, error: `Unknown action: ${action}` },
      { status: 400 },
    );
  } catch (err) {
    console.error("[creator/sponsors]", err);
    return NextResponse.json(
      { ok: false, error: "Unexpected error." },
      { status: 500 },
    );
  }
}
