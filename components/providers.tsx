"use client";

import { useEffect } from "react";

import { rehydrateAllStores, useQuestStore } from "@/store";

export function Providers({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    void rehydrateAllStores().then(() => {
      useQuestStore.getState().resetDailyQuests();
      useQuestStore.getState().ensureMvaQuestCatalog();
    });
  }, []);

  return <>{children}</>;
}
