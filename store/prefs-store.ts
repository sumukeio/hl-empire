import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";

/**
 * 与 Supabase `user_empire.prefs_json` 对齐的轻量偏好（原散落 localStorage 收编）。
 */
export type PrefsState = {
  /** `todayKey()` 当日已记「首单捷报」则与当日一致，避免重复邸报 */
  oracleFirstOrderJiebaoDate: string;
  /** 已记录「早朝停办」邸报的日历日（todayKey） */
  redlineMorningStallLoggedDays: Record<string, true>;
};

export type PrefsActions = {
  setOracleFirstOrderJiebaoDate: (day: string) => void;
  markRedlineMorningStallLogged: (day: string) => void;
};

const defaultPrefs: PrefsState = {
  oracleFirstOrderJiebaoDate: "",
  redlineMorningStallLoggedDays: {},
};

export const usePrefsStore = create<PrefsState & PrefsActions>()(
  persist(
    (set) => ({
      ...defaultPrefs,
      setOracleFirstOrderJiebaoDate: (day) => set({ oracleFirstOrderJiebaoDate: day }),
      markRedlineMorningStallLogged: (day) =>
        set((s) => ({
          redlineMorningStallLoggedDays: {
            ...s.redlineMorningStallLoggedDays,
            [day]: true,
          },
        })),
    }),
    {
      name: "hanling-prefs",
      storage: createJSONStorage(() => localStorage),
      skipHydration: true,
      partialize: (s) => ({
        oracleFirstOrderJiebaoDate: s.oracleFirstOrderJiebaoDate,
        redlineMorningStallLoggedDays: s.redlineMorningStallLoggedDays,
      }),
    }
  )
);

export function parsePrefsJson(raw: unknown): PrefsState {
  if (!raw || typeof raw !== "object") {
    return { ...defaultPrefs };
  }
  const r = raw as Record<string, unknown>;
  const oracle =
    typeof r.oracleFirstOrderJiebaoDate === "string"
      ? r.oracleFirstOrderJiebaoDate
      : "";
  const daysRaw = r.redlineMorningStallLoggedDays;
  const redlineMorningStallLoggedDays: Record<string, true> = {};
  if (daysRaw && typeof daysRaw === "object" && !Array.isArray(daysRaw)) {
    for (const k of Object.keys(daysRaw as Record<string, unknown>)) {
      if (k) redlineMorningStallLoggedDays[k] = true;
    }
  }
  return { oracleFirstOrderJiebaoDate: oracle, redlineMorningStallLoggedDays };
}

/** 登录/拉云前：把旧版独立键迁入 prefs 并删除旧键 */
export function migrateLegacyPrefsFromLocalStorage(): void {
  if (typeof window === "undefined") return;
  const LEGACY_ORACLE = "hanling-oracle-first-order-jiebao-date";
  const PREFIX_REDLINE = "hanling-redline-morning-stall-";

  const s = usePrefsStore.getState();
  let oracle = s.oracleFirstOrderJiebaoDate;
  try {
    const legacy = window.localStorage.getItem(LEGACY_ORACLE);
    if (legacy && !oracle) {
      oracle = legacy;
    }
    window.localStorage.removeItem(LEGACY_ORACLE);
  } catch {
    /* ignore */
  }

  const mergedDays = { ...s.redlineMorningStallLoggedDays };
  try {
    const keys: string[] = [];
    for (let i = 0; i < window.localStorage.length; i++) {
      const k = window.localStorage.key(i);
      if (k?.startsWith(PREFIX_REDLINE)) keys.push(k);
    }
    for (const k of keys) {
      const day = k.slice(PREFIX_REDLINE.length);
      if (day) mergedDays[day] = true;
      window.localStorage.removeItem(k);
    }
  } catch {
    /* ignore */
  }

  usePrefsStore.setState({
    oracleFirstOrderJiebaoDate: oracle,
    redlineMorningStallLoggedDays: mergedDays,
  });
}
