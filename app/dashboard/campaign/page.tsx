import type { Metadata } from "next";

import { CampaignOpsPageChrome } from "@/components/dashboard/campaign-ops-view";

export const metadata: Metadata = {
  title: "集团军 · 战役集群 · 瀚翎帝国",
  description: "多城流水线批处理与集群点卯",
};

export default function CampaignOpsPage() {
  return <CampaignOpsPageChrome />;
}
