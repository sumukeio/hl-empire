"use client";

import { useEmperorStore } from "./emperor-store";
import { useEventStore } from "./event-store";
import { useMapStore } from "./map-store";
import { usePrefsStore } from "./prefs-store";
import { useQuestStore } from "./quest-store";

/**
 * 在客户端挂载后恢复所有 persist 存储（与 skipHydration 配套）。
 */
export function rehydrateAllStores(): Promise<void[]> {
  return Promise.all([
    useEmperorStore.persist.rehydrate(),
    useMapStore.persist.rehydrate(),
    useQuestStore.persist.rehydrate(),
    useEventStore.persist.rehydrate(),
    usePrefsStore.persist.rehydrate(),
  ]);
}
