import type { Metadata } from "next";

import { ActivityJournalPageChrome } from "@/components/dashboard/activity-journal-view";

export const metadata: Metadata = {
  title: "勤政录 · 瀚翎帝国",
  description: "按日、周、月查看邸报并导出",
};

export default function ActivityJournalPage() {
  return <ActivityJournalPageChrome />;
}
