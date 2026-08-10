"use client";

import { useEffect, useRef } from "react";
import { trackGroceryShareView } from "@/lib/analytics/ga";

/** Fires grocery_share_view once per mount on shared grocery pages. */
export default function GroceryShareViewTracker() {
  const fired = useRef(false);

  useEffect(() => {
    if (fired.current) return;
    fired.current = true;
    trackGroceryShareView();
  }, []);

  return null;
}
