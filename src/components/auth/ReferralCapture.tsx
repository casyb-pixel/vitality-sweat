"use client";

import { useEffect } from "react";
import {
  parseCampaignAttribution,
  rememberCampaignAttribution,
} from "@/lib/marketing/campaign-attribution";
import {
  normalizeReferralCode,
  rememberReferralCode,
} from "@/lib/referrals/codes";

/**
 * Persist `?ref=`, `?src=`, `?gym=`, and UTM params from any public URL
 * (including /invite and /app) before auth redirects.
 */
export default function ReferralCapture() {
  useEffect(() => {
    try {
      const params = new URLSearchParams(window.location.search);
      const code = normalizeReferralCode(params.get("ref"));
      if (code) rememberReferralCode(code);

      const campaign = parseCampaignAttribution(params);
      if (campaign) rememberCampaignAttribution(campaign);
    } catch {
      // ignore
    }
  }, []);

  return null;
}
