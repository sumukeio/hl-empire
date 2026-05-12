import type { Metadata } from "next";

import { SettingsView } from "@/components/settings/settings-view";

export const metadata: Metadata = {
  title: "造办处 · 瀚翎帝国",
  description: "疆域司与枢密院 — 系统配置",
};

export default function SettingsPage() {
  return <SettingsView />;
}
