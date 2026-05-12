import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";

import type { EventLog, EventLogType } from "./types";

const MAX_PERSISTED_LOGS = 80;

function newLogId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return `log-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

export interface EventState {
  logs: EventLog[];
}

export interface EventActions {
  addLog: (
    message: string,
    type?: EventLogType,
    meta?: { cityName?: string; emphasis?: "calamity" | "goldFlash" }
  ) => void;
  clearLogs: () => void;
}

export const useEventStore = create<EventState & EventActions>()(
  persist(
    (set) => ({
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
          };
          const next = [entry, ...s.logs];
          return { logs: next.slice(0, MAX_PERSISTED_LOGS) };
        }),
      clearLogs: () => set({ logs: [] }),
    }),
    {
      name: "hanling-event",
      storage: createJSONStorage(() => localStorage),
      skipHydration: true,
      partialize: (s) => ({ logs: s.logs }),
    }
  )
);
