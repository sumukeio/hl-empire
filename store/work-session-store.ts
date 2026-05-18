import { create } from "zustand";

import type { QuestWorkSessionRecord } from "./types";

export interface WorkSessionState {
  sessions: QuestWorkSessionRecord[];
  loaded: boolean;
}

export interface WorkSessionActions {
  setSessions: (sessions: QuestWorkSessionRecord[]) => void;
  upsertSession: (session: QuestWorkSessionRecord) => void;
  setLoaded: (loaded: boolean) => void;
  clearSessions: () => void;
}

export const useWorkSessionStore = create<WorkSessionState & WorkSessionActions>()(
  (set) => ({
    sessions: [],
    loaded: false,
    setSessions: (sessions) => set({ sessions, loaded: true }),
    upsertSession: (session) =>
      set((s) => {
        const idx = s.sessions.findIndex(
          (x) => x.clientSessionId === session.clientSessionId
        );
        if (idx < 0) {
          return { sessions: [session, ...s.sessions] };
        }
        const next = [...s.sessions];
        next[idx] = session;
        return { sessions: next };
      }),
    setLoaded: (loaded) => set({ loaded }),
    clearSessions: () => set({ sessions: [], loaded: false }),
  })
);
