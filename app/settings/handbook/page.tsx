import type { Metadata } from "next";

import { ImperialHandbookView } from "@/components/settings/imperial-handbook";

export const metadata: Metadata = {
  title: "帝国手册 · 造办处 · 瀚翎帝国",
  description: "瀚翎帝国玩法与概念速查：国库、军费、九州图志、军机、邸报与造办处",
};

export default function SettingsHandbookPage() {
  return <ImperialHandbookView />;
}
