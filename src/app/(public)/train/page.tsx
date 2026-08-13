import type { Metadata } from "next";
import TopicHubView from "@/components/public/TopicHubView";
import { getHub } from "@/lib/content/hubs";
import { buildCanonical } from "@/lib/seo/site";

const hub = getHub("train")!;

export const metadata: Metadata = {
  title: hub.title,
  description: hub.description,
  alternates: { canonical: buildCanonical("/train") },
};

export default function TrainHubPage() {
  return <TopicHubView slug="train" />;
}
