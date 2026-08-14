"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useState } from "react";
import ShareEngineCard from "@/components/app/ShareEngineCard";

function ShareEngineHomeInner() {
  const params = useSearchParams();
  const router = useRouter();
  const autoOpen = params.get("share") === "engine";
  const [dismissed, setDismissed] = useState(false);

  return (
    <ShareEngineCard
      autoOpen={autoOpen && !dismissed}
      compact={autoOpen && !dismissed}
      onDismissAuto={() => {
        setDismissed(true);
        if (autoOpen) router.replace("/app");
      }}
    />
  );
}

export default function ShareEngineHomeSection() {
  return (
    <Suspense fallback={null}>
      <ShareEngineHomeInner />
    </Suspense>
  );
}
