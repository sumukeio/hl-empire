import type { Metadata } from "next";

import { DashboardShell } from "@/components/dashboard/dashboard-shell";

export const metadata: Metadata = {
  title: "沙盘 · 瀚翎帝国",
  description: "中央沙盘与军机处",
};

export default function DashboardPage() {
  return <DashboardShell />;
}
