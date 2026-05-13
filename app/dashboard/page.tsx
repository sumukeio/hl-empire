import type { Metadata } from "next";

import { DashboardShell } from "@/components/dashboard/dashboard-shell";

export const metadata: Metadata = {
  title: "九州图志 · 瀚翎帝国",
  description: "天下大势与军机处",
};

export default function DashboardPage() {
  return <DashboardShell />;
}
