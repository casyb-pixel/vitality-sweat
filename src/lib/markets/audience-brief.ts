/**
 * Audience Brief export for sales pitches (Markdown + JSON).
 * Aggregates only — no member PII.
 */

import type { AudienceMetrics } from "@/lib/creator/audience";
import type { CampaignProofMetrics } from "@/lib/sponsors/serve";
import { METROS, type MetroId } from "@/lib/markets/metros";

export type AudienceBriefSlotRow = {
  slotId: string;
  impressions: number;
  clicks: number;
};

export type AudienceBriefPayload = {
  generatedAt: string;
  marketFocus: MetroId | "all";
  marketLabel: string;
  goalNote: string;
  activeDefinition: string;
  metrics: {
    registeredWithZip: number;
    registeredTotal: number;
    activeUsers28d: number;
    workoutsLogged28d: number;
    groceryListsCreated28d: number;
    referredTotal: number;
    referredWithZip: number;
  };
  byMetro: AudienceMetrics["byMetro"];
  byZipTop: AudienceMetrics["byZip"];
  engagement: {
    workoutsLogged28d: number;
    groceryListsCreated28d: number;
    groceryListsShareable28d: number;
  };
  topSlots: AudienceBriefSlotRow[];
  campaignProof: CampaignProofMetrics | null;
  rateCardPackages: {
    id: string;
    name: string;
    impressions: string;
    slots: string;
    notes: string;
  }[];
};

/** Static rate-card packages (no payments) — sales one-pager fields. */
export const RATE_CARD_PACKAGES = [
  {
    id: "starter",
    name: "Starter flight (30 days)",
    impressions: "~25k–50k estimated impressions*",
    slots: "home-below-hero + chronicles-top",
    notes: "Best for a single gym or grocery test in one metro.",
  },
  {
    id: "growth",
    name: "Growth flight (60 days)",
    impressions: "~75k–150k estimated impressions*",
    slots: "home + chronicles + blog-inline",
    notes: "Includes grocery-footer add-on for Rouses-style share loops.",
  },
  {
    id: "beachhead",
    name: "Beachhead metro (90 days)",
    impressions: "~200k+ estimated impressions*",
    slots: "Full public + app-home inventory",
    notes: "Paired with Audience Brief + weekly challenge content cadence.",
  },
] as const;

export function buildAudienceBrief(input: {
  metrics: AudienceMetrics;
  marketFocus?: MetroId | "all" | null;
  campaignProof?: CampaignProofMetrics | null;
  topSlots?: AudienceBriefSlotRow[];
}): AudienceBriefPayload {
  const focus = input.marketFocus ?? "lafayette";
  const metro =
    focus !== "all" ? METROS.find((m) => m.id === focus) : null;

  return {
    generatedAt: new Date().toISOString(),
    marketFocus: focus === "all" ? "all" : focus,
    marketLabel: metro?.label ?? "All tracked metros",
    goalNote:
      "Playbook toward ~5,000 actives: densify Lafayette, then replicate Lake Charles / New Iberia with the same free Engine + sponsor slots.",
    activeDefinition: input.metrics.activeDefinition,
    metrics: {
      registeredWithZip: input.metrics.registeredWithZip,
      registeredTotal: input.metrics.registeredTotal,
      activeUsers28d: input.metrics.activeUsers28d,
      workoutsLogged28d: input.metrics.workoutsLogged28d,
      groceryListsCreated28d: input.metrics.groceryListsCreated28d,
      referredTotal: input.metrics.referredTotal,
      referredWithZip: input.metrics.referredWithZip,
    },
    byMetro: input.metrics.byMetro ?? [],
    byZipTop: (input.metrics.byZip ?? []).slice(0, 12),
    engagement: {
      workoutsLogged28d: input.metrics.workoutsLogged28d,
      groceryListsCreated28d: input.metrics.groceryListsCreated28d,
      groceryListsShareable28d: input.metrics.groceryListsShareable28d,
    },
    topSlots: input.topSlots ?? [],
    campaignProof: input.campaignProof ?? null,
    rateCardPackages: RATE_CARD_PACKAGES.map((p) => ({ ...p })),
  };
}

export function audienceBriefToMarkdown(brief: AudienceBriefPayload): string {
  const lines: string[] = [];
  lines.push(`# Audience Brief · ${brief.marketLabel}`);
  lines.push("");
  lines.push(`Generated: ${brief.generatedAt}`);
  lines.push("");
  lines.push(brief.goalNote);
  lines.push("");
  lines.push("## Active definition");
  lines.push(brief.activeDefinition);
  lines.push("");
  lines.push("## Snapshot (28d)");
  lines.push(
    `- Registered w/ ZIP: ${brief.metrics.registeredWithZip} (of ${brief.metrics.registeredTotal})`,
  );
  lines.push(`- Active users: ${brief.metrics.activeUsers28d}`);
  lines.push(`- Workouts logged: ${brief.metrics.workoutsLogged28d}`);
  lines.push(`- Grocery lists: ${brief.metrics.groceryListsCreated28d}`);
  lines.push(
    `- Referred signups: ${brief.metrics.referredTotal} (${brief.metrics.referredWithZip} with ZIP)`,
  );
  lines.push("");
  lines.push("## Actives by metro");
  if (!brief.byMetro.length) {
    lines.push("- No metro-tagged members yet.");
  } else {
    for (const row of brief.byMetro) {
      lines.push(
        `- **${row.label}**: ${row.active28d} active / ${row.registered} registered / ${row.referred} referred`,
      );
    }
  }
  lines.push("");
  lines.push("## Top ZIPs");
  if (!brief.byZipTop.length) {
    lines.push("- No ZIP breakdown yet.");
  } else {
    for (const z of brief.byZipTop) {
      lines.push(
        `- ${z.zipCode}${z.city ? ` (${z.city})` : ""}: ${z.active28d} active / ${z.registered} registered`,
      );
    }
  }
  lines.push("");
  lines.push("## Engagement");
  lines.push(`- Workouts: ${brief.engagement.workoutsLogged28d}`);
  lines.push(
    `- Grocery lists: ${brief.engagement.groceryListsCreated28d} (${brief.engagement.groceryListsShareable28d} shareable)`,
  );
  lines.push("");
  lines.push("## Top sponsorship slots");
  if (!brief.topSlots.length) {
    lines.push("- No slot events yet (open public pages to accumulate proof).");
  } else {
    for (const s of brief.topSlots) {
      lines.push(
        `- ${s.slotId}: ${s.impressions} impressions / ${s.clicks} clicks`,
      );
    }
  }
  if (brief.campaignProof) {
    lines.push("");
    lines.push(
      `## Campaign proof · ${brief.campaignProof.sponsorName} / ${brief.campaignProof.campaignName}`,
    );
    lines.push(
      `- Impressions: ${brief.campaignProof.impressions} · Clicks: ${brief.campaignProof.clicks} · CTR: ${(brief.campaignProof.ctr * 100).toFixed(2)}%`,
    );
    if (brief.campaignProof.localActivesInTargetZips != null) {
      lines.push(
        `- Local actives in target ZIPs: ${brief.campaignProof.localActivesInTargetZips}`,
      );
    }
  }
  lines.push("");
  lines.push("## Rate-card packages (no payments wired)");
  for (const pkg of brief.rateCardPackages) {
    lines.push(`### ${pkg.name}`);
    lines.push(`- Impressions: ${pkg.impressions}`);
    lines.push(`- Slots: ${pkg.slots}`);
    lines.push(`- Notes: ${pkg.notes}`);
    lines.push("");
  }
  lines.push(
    "\\*Impression ranges are planning estimates for sales conversations until live events accumulate.",
  );
  return lines.join("\n");
}
