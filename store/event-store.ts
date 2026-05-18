import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";

import { applyEventLogRevert } from "@/lib/apply-event-log-revert";
import {
  removeEventLogFromCloud,
  syncEventLogToCloud,
} from "@/lib/activity-journal-bridge";
import type { EventLog, EventLogRevert, EventLogType } from "./types";

/** 本地缓存上限；云端 event_log 表永久保留 */
const MAX_LOCAL_CACHED_LOGS = 500;

function newLogId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return `log-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

export interface EventState {
  logs: EventLog[];
}

export type RevertLogResult =
  | { ok: true }
  | {
      ok: false;
      reason:
        | "not_found"
        | "no_revert"
        | "state_mismatch"
        | "city_missing"
        | "not_supported";
    };

export interface EventActions {
  addLog: (
    message: string,
    type?: EventLogType,
    meta?: {
      cityName?: string;
      emphasis?:
        | "calamity"
        | "goldFlash"
        | "goldFlashLong"
        | "crimsonDecree";
      revert?: EventLogRevert;
    }
  ) => void;
  clearLogs: () => void;
  /** 撤回单条邸报并执行其 `revert` 回滚（若有） */
  revertLog: (id: string) => RevertLogResult;
  /** 从 Supabase 拉取后整表替换（登录/bootstrap） */
  replaceLogsFromCloud: (logs: EventLog[]) => void;
}

export const useEventStore = create<EventState & EventActions>()(
  persist(
    (set, get) => ({
      logs: [],
      addLog: (message, type = "info", meta) =>
        set((s) => {
          const entry: EventLog = {
            id: newLogId(),
            time: Date.now(),
            message,
            type,
            ...(meta?.cityName ? { cityName: meta.cityName } : {}),
            ...(meta?.emphasis ? { emphasis: meta.emphasis } : {}),
            ...(meta?.revert ? { revert: meta.revert } : {}),
          };
          const next = [entry, ...s.logs];
          syncEventLogToCloud(entry);
          return { logs: next.slice(0, MAX_LOCAL_CACHED_LOGS) };
        }),
      clearLogs: () => set({ logs: [] }),
      replaceLogsFromCloud: (logs) =>
        set({ logs: logs.slice(0, MAX_LOCAL_CACHED_LOGS) }),
      revertLog: (id) => {
        const log = get().logs.find((l) => l.id === id);
        if (!log) return { ok: false, reason: "not_found" };
        if (!log.revert) return { ok: false, reason: "no_revert" };
        const r = applyEventLogRevert(log);
        if (!r.ok) return { ok: false, reason: r.reason };
        removeEventLogFromCloud(id);
        set((s) => ({ logs: s.logs.filter((l) => l.id !== id) }));
        return { ok: true };
      },
    }),
    {
      name: "hanling-event",
      storage: createJSONStorage(() => localStorage),
      skipHydration: true,
      partialize: (s) => ({ logs: s.logs }),
    }
  )
);
