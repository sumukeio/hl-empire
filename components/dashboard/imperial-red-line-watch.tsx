"use client";

import { useEffect } from "react";

import { todayKey } from "@/lib/today-key";
import {
  CURFEW_HEALTH_THRESHOLD,
  EARLY_COURT_STAMINA_THRESHOLD,
  isEarlyCourtHours,
} from "@/lib/imperial-vitals";
import { useEmperorStore, useEventStore, usePrefsStore } from "@/store";

const SESSION_CURFEW = "hanling-redline-curfew-log";

export function ImperialRedLineWatch() {
  const health = useEmperorStore((s) => s.health);
  const addLog = useEventStore((s) => s.addLog);

  useEffect(() => {
    if (health >= CURFEW_HEALTH_THRESHOLD) return;
    const day = todayKey();
    const key = `${SESSION_CURFEW}-${day}`;
    try {
      if (typeof window !== "undefined" && window.sessionStorage.getItem(key)) {
        return;
      }
      addLog("龙体极度透支，请立即安寝！", "battle");
      if (typeof window !== "undefined") {
        window.sessionStorage.setItem(key, "1");
      }
    } catch {
      addLog("龙体极度透支，请立即安寝！", "battle");
    }
  }, [health, addLog]);

  useEffect(() => {
    const checkMorning = () => {
      const stamina = useEmperorStore.getState().stamina;
      if (stamina >= EARLY_COURT_STAMINA_THRESHOLD) return;
      if (!isEarlyCourtHours()) return;
      const day = todayKey();
      const prefs = usePrefsStore.getState();
      if (prefs.redlineMorningStallLoggedDays[day]) return;
      addLog("体力不足 40，今日早朝停办。", "battle");
      prefs.markRedlineMorningStallLogged(day);
    };

    checkMorning();
    const id = window.setInterval(checkMorning, 60_000);
    return () => window.clearInterval(id);
  }, [addLog]);

  return null;
}
