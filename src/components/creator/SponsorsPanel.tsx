"use client";

import { useCallback, useEffect, useState } from "react";
import { METROS, zipsForMarket } from "@/lib/markets/metros";
import type { SponsorSlotDefinition } from "@/lib/sponsors/slots";

type Creative = {
  id: string;
  slot_id: string;
  headline: string;
  body: string | null;
  image_url: string | null;
  click_url: string;
  cta_label: string;
  priority: number;
  is_active: boolean;
};

type Campaign = {
  id: string;
  name: string;
  status: string;
  starts_at: string | null;
  ends_at: string | null;
  target_zips: string[];
  target_markets?: string[];
  notes: string | null;
  is_house: boolean;
  sponsor_creatives: Creative[] | null;
};

type Sponsor = {
  id: string;
  name: string;
  slug: string;
  logo_url: string | null;
  website_url: string | null;
  contact_email: string | null;
  notes: string | null;
  is_active: boolean;
  sponsor_campaigns: Campaign[] | null;
};

const fieldClass =
  "mt-1 w-full border border-brand-ink/15 bg-surface px-3 py-2.5 font-sans text-sm text-brand-ink outline-none focus:border-brand-orange";

export default function SponsorsPanel() {
  const [sponsors, setSponsors] = useState<Sponsor[]>([]);
  const [slots, setSlots] = useState<SponsorSlotDefinition[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const [sponsorName, setSponsorName] = useState("");
  const [sponsorUrl, setSponsorUrl] = useState("");

  const [campaignSponsorId, setCampaignSponsorId] = useState("");
  const [campaignName, setCampaignName] = useState("");
  const [campaignZips, setCampaignZips] = useState("70501, 70503, 70506, 70508");
  const [campaignMarket, setCampaignMarket] = useState("lafayette");
  const [campaignStatus, setCampaignStatus] = useState("active");

  const [creativeCampaignId, setCreativeCampaignId] = useState("");
  const [creativeSlot, setCreativeSlot] = useState("home-below-hero");
  const [creativeHeadline, setCreativeHeadline] = useState("");
  const [creativeBody, setCreativeBody] = useState("");
  const [creativeClick, setCreativeClick] = useState("");
  const [creativeCta, setCreativeCta] = useState("Learn more");
  const [creativeImage, setCreativeImage] = useState("");

  const load = useCallback(async () => {
    setError(null);
    try {
      const res = await fetch("/api/creator/sponsors");
      const json = (await res.json()) as {
        ok?: boolean;
        error?: string;
        sponsors?: Sponsor[];
        slots?: SponsorSlotDefinition[];
      };
      if (!res.ok || !json.ok) {
        setError(json.error ?? "Could not load sponsors.");
        return;
      }
      setSponsors(json.sponsors ?? []);
      setSlots(json.slots ?? []);
      if (!campaignSponsorId && json.sponsors?.[0]?.id) {
        setCampaignSponsorId(json.sponsors[0].id);
      }
      const firstCampaign = json.sponsors
        ?.flatMap((s) => s.sponsor_campaigns ?? [])
        .find((c) => !c.is_house);
      if (!creativeCampaignId && firstCampaign) {
        setCreativeCampaignId(firstCampaign.id);
      }
    } catch {
      setError("Network error loading sponsors.");
    } finally {
      setLoading(false);
    }
  }, [campaignSponsorId, creativeCampaignId]);

  useEffect(() => {
    void load();
  }, [load]);

  async function postAction(payload: Record<string, unknown>) {
    setBusy(true);
    setMessage(null);
    setError(null);
    try {
      const res = await fetch("/api/creator/sponsors", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const json = (await res.json()) as { ok?: boolean; error?: string };
      if (!res.ok || !json.ok) {
        setError(json.error ?? "Save failed.");
        return;
      }
      setMessage("Saved.");
      await load();
    } catch {
      setError("Network error.");
    } finally {
      setBusy(false);
    }
  }

  const allCampaigns = sponsors.flatMap((s) =>
    (s.sponsor_campaigns ?? []).map((c) => ({
      ...c,
      sponsorName: s.name,
    })),
  );

  if (loading) {
    return (
      <section className="border border-brand-ink/10 bg-surface-elevated px-4 py-5">
        <p className="font-sans text-sm text-brand-muted">Loading sponsors…</p>
      </section>
    );
  }

  return (
    <div className="space-y-6">
      <section className="border border-brand-ink/10 bg-surface-elevated px-4 py-5 sm:px-5">
        <p className="eyebrow text-brand-orange">Direct-sold inventory</p>
        <h2 className="mt-1 font-display text-xl text-brand-ink">Sponsors</h2>
        <p className="mt-1 max-w-2xl font-sans text-sm leading-relaxed text-brand-muted">
          Pitch Red&apos;s, Rouses, and local partners into registered slots.
          Unsold inventory shows the house Engine CTA. No AdSense required.
        </p>
        {error ? (
          <p className="mt-3 font-sans text-sm text-red-700" role="alert">
            {error}
          </p>
        ) : null}
        {message ? (
          <p className="mt-3 font-sans text-sm text-brand-ink">{message}</p>
        ) : null}

        <div className="mt-4 overflow-x-auto">
          <table className="w-full min-w-[32rem] border-collapse text-left font-sans text-sm">
            <thead>
              <tr className="border-b border-brand-ink/15 text-xs font-bold uppercase tracking-[0.08em] text-brand-muted">
                <th className="py-2 pr-3">Slot</th>
                <th className="py-2 pr-3">Surface</th>
                <th className="py-2">Size</th>
              </tr>
            </thead>
            <tbody>
              {slots.map((slot) => (
                <tr key={slot.id} className="border-b border-brand-ink/10">
                  <td className="py-2 pr-3 font-semibold text-brand-ink">
                    {slot.id}
                  </td>
                  <td className="py-2 pr-3 text-brand-muted">{slot.label}</td>
                  <td className="py-2 text-brand-muted">{slot.size}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="grid gap-4 lg:grid-cols-2">
        <form
          className="border border-brand-ink/10 bg-surface-elevated px-4 py-4"
          onSubmit={(e) => {
            e.preventDefault();
            void postAction({
              action: "create_sponsor",
              name: sponsorName,
              website_url: sponsorUrl || null,
            });
            setSponsorName("");
            setSponsorUrl("");
          }}
        >
          <h3 className="font-display text-lg text-brand-ink">Add sponsor</h3>
          <label className="mt-3 block font-sans text-sm">
            Name
            <input
              className={fieldClass}
              value={sponsorName}
              onChange={(e) => setSponsorName(e.target.value)}
              required
            />
          </label>
          <label className="mt-3 block font-sans text-sm">
            Website / click base URL
            <input
              className={fieldClass}
              value={sponsorUrl}
              onChange={(e) => setSponsorUrl(e.target.value)}
              placeholder="https://"
            />
          </label>
          <button
            type="submit"
            disabled={busy}
            className="mt-4 inline-flex min-h-11 items-center bg-brand-orange px-4 py-2 font-sans text-xs font-bold uppercase tracking-[0.08em] text-white disabled:opacity-50"
          >
            Create sponsor
          </button>
        </form>

        <form
          className="border border-brand-ink/10 bg-surface-elevated px-4 py-4"
          onSubmit={(e) => {
            e.preventDefault();
            void postAction({
              action: "create_campaign",
              sponsor_id: campaignSponsorId,
              name: campaignName,
              status: campaignStatus,
              target_market: campaignMarket,
              target_zips_text: campaignZips,
              starts_at: new Date().toISOString(),
              ends_at: new Date(
                Date.now() + 90 * 24 * 60 * 60 * 1000,
              ).toISOString(),
            });
            setCampaignName("");
          }}
        >
          <h3 className="font-display text-lg text-brand-ink">Add campaign</h3>
          <label className="mt-3 block font-sans text-sm">
            Sponsor
            <select
              className={fieldClass}
              value={campaignSponsorId}
              onChange={(e) => setCampaignSponsorId(e.target.value)}
              required
            >
              <option value="">Select…</option>
              {sponsors.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>
          </label>
          <label className="mt-3 block font-sans text-sm">
            Campaign name
            <input
              className={fieldClass}
              value={campaignName}
              onChange={(e) => setCampaignName(e.target.value)}
              required
            />
          </label>
          <label className="mt-3 block font-sans text-sm">
            Status
            <select
              className={fieldClass}
              value={campaignStatus}
              onChange={(e) => setCampaignStatus(e.target.value)}
            >
              <option value="draft">draft</option>
              <option value="active">active</option>
              <option value="paused">paused</option>
              <option value="ended">ended</option>
            </select>
          </label>
          <label className="mt-3 block font-sans text-sm">
            Market playbook
            <select
              className={fieldClass}
              value={campaignMarket}
              onChange={(e) => {
                const next = e.target.value;
                setCampaignMarket(next);
                const zips = zipsForMarket(next);
                if (zips.length) setCampaignZips(zips.join(", "));
              }}
            >
              {METROS.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.shortLabel}
                </option>
              ))}
            </select>
          </label>
          <label className="mt-3 block font-sans text-sm">
            Target ZIPs (optional)
            <input
              className={fieldClass}
              value={campaignZips}
              onChange={(e) => setCampaignZips(e.target.value)}
              placeholder="70501, 70508"
            />
          </label>
          <button
            type="submit"
            disabled={busy}
            className="mt-4 inline-flex min-h-11 items-center bg-brand-orange px-4 py-2 font-sans text-xs font-bold uppercase tracking-[0.08em] text-white disabled:opacity-50"
          >
            Create campaign
          </button>
        </form>
      </section>

      <form
        className="border border-brand-ink/10 bg-surface-elevated px-4 py-4"
        onSubmit={(e) => {
          e.preventDefault();
          void postAction({
            action: "upsert_creative",
            campaign_id: creativeCampaignId,
            slot_id: creativeSlot,
            headline: creativeHeadline,
            body: creativeBody || null,
            click_url: creativeClick,
            cta_label: creativeCta,
            image_url: creativeImage || null,
            priority: 10,
          });
          setCreativeHeadline("");
          setCreativeBody("");
        }}
      >
        <h3 className="font-display text-lg text-brand-ink">Add creative</h3>
        <div className="mt-3 grid gap-3 sm:grid-cols-2">
          <label className="block font-sans text-sm">
            Campaign
            <select
              className={fieldClass}
              value={creativeCampaignId}
              onChange={(e) => setCreativeCampaignId(e.target.value)}
              required
            >
              <option value="">Select…</option>
              {allCampaigns.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.sponsorName} · {c.name}
                  {c.is_house ? " (house)" : ""}
                </option>
              ))}
            </select>
          </label>
          <label className="block font-sans text-sm">
            Slot
            <select
              className={fieldClass}
              value={creativeSlot}
              onChange={(e) => setCreativeSlot(e.target.value)}
            >
              {slots.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.id}
                </option>
              ))}
            </select>
          </label>
          <label className="block font-sans text-sm sm:col-span-2">
            Headline
            <input
              className={fieldClass}
              value={creativeHeadline}
              onChange={(e) => setCreativeHeadline(e.target.value)}
              required
            />
          </label>
          <label className="block font-sans text-sm sm:col-span-2">
            Body
            <textarea
              className={`${fieldClass} min-h-[4.5rem]`}
              value={creativeBody}
              onChange={(e) => setCreativeBody(e.target.value)}
            />
          </label>
          <label className="block font-sans text-sm">
            Click URL
            <input
              className={fieldClass}
              value={creativeClick}
              onChange={(e) => setCreativeClick(e.target.value)}
              required
              placeholder="https://"
            />
          </label>
          <label className="block font-sans text-sm">
            CTA label
            <input
              className={fieldClass}
              value={creativeCta}
              onChange={(e) => setCreativeCta(e.target.value)}
            />
          </label>
          <label className="block font-sans text-sm sm:col-span-2">
            Image / logo URL (optional)
            <input
              className={fieldClass}
              value={creativeImage}
              onChange={(e) => setCreativeImage(e.target.value)}
            />
          </label>
        </div>
        <button
          type="submit"
          disabled={busy}
          className="mt-4 inline-flex min-h-11 items-center bg-brand-orange px-4 py-2 font-sans text-xs font-bold uppercase tracking-[0.08em] text-white disabled:opacity-50"
        >
          Save creative
        </button>
      </form>

      <section className="space-y-4">
        {sponsors.map((sponsor) => (
          <article
            key={sponsor.id}
            className="border border-brand-ink/10 bg-surface-elevated px-4 py-4"
          >
            <div className="flex flex-wrap items-start justify-between gap-2">
              <div>
                <h3 className="font-display text-lg text-brand-ink">
                  {sponsor.name}
                </h3>
                <p className="font-sans text-xs text-brand-muted">
                  {sponsor.slug}
                  {sponsor.is_active ? "" : " · inactive"}
                </p>
              </div>
              <button
                type="button"
                disabled={busy}
                onClick={() =>
                  void postAction({
                    action: "update_sponsor",
                    id: sponsor.id,
                    is_active: !sponsor.is_active,
                  })
                }
                className="font-sans text-xs font-bold uppercase tracking-[0.08em] text-brand-orange hover:underline"
              >
                {sponsor.is_active ? "Deactivate" : "Activate"}
              </button>
            </div>
            {(sponsor.sponsor_campaigns ?? []).map((campaign) => (
              <div
                key={campaign.id}
                className="mt-4 border border-brand-ink/10 bg-surface px-3 py-3"
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="font-sans text-sm font-semibold text-brand-ink">
                    {campaign.name}{" "}
                    <span className="font-normal text-brand-muted">
                      · {campaign.status}
                      {campaign.is_house ? " · house" : ""}
                    </span>
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {(["active", "paused", "ended", "draft"] as const).map(
                      (status) => (
                        <button
                          key={status}
                          type="button"
                          disabled={busy || campaign.status === status}
                          onClick={() =>
                            void postAction({
                              action: "update_campaign",
                              id: campaign.id,
                              status,
                            })
                          }
                          className="font-sans text-[0.65rem] font-bold uppercase tracking-[0.08em] text-brand-muted hover:text-brand-orange disabled:opacity-40"
                        >
                          {status}
                        </button>
                      ),
                    )}
                  </div>
                </div>
                {campaign.target_markets?.length ? (
                  <p className="mt-1 font-sans text-xs text-brand-muted">
                    Markets: {campaign.target_markets.join(", ")}
                  </p>
                ) : null}
                {campaign.target_zips?.length ? (
                  <p className="mt-1 font-sans text-xs text-brand-muted">
                    ZIPs: {campaign.target_zips.join(", ")}
                  </p>
                ) : null}
                <ul className="mt-3 space-y-2">
                  {(campaign.sponsor_creatives ?? []).map((creative) => (
                    <li
                      key={creative.id}
                      className="flex flex-wrap items-start justify-between gap-2 border-t border-brand-ink/10 pt-2 font-sans text-xs"
                    >
                      <div>
                        <p className="font-semibold text-brand-ink">
                          [{creative.slot_id}] {creative.headline}
                        </p>
                        <p className="text-brand-muted">{creative.click_url}</p>
                      </div>
                      <button
                        type="button"
                        disabled={busy}
                        onClick={() =>
                          void postAction({
                            action: "delete_creative",
                            id: creative.id,
                          })
                        }
                        className="text-red-700 hover:underline"
                      >
                        Delete
                      </button>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </article>
        ))}
      </section>
    </div>
  );
}
