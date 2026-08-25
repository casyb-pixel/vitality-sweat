"use client";

import { useEffect } from "react";
import { trackViewItem } from "@/lib/analytics/ga";

type ViewItemTrackerProps = {
  itemId: string;
  itemName: string;
  price: string | number;
  currency: string;
};

/** Fires GA4 view_item once per mount on product detail pages. */
export default function ViewItemTracker({
  itemId,
  itemName,
  price,
  currency,
}: ViewItemTrackerProps) {
  useEffect(() => {
    trackViewItem({
      currency,
      value: price,
      items: [
        {
          item_id: itemId,
          item_name: itemName,
          price: Number.parseFloat(String(price)) || 0,
          quantity: 1,
        },
      ],
    });
  }, [currency, itemId, itemName, price]);

  return null;
}
