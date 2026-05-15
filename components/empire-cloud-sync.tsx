"use client";

import { useEffect, useRef } from "react";

import {
  applyCloudUserEmpireRow,
  fetchUserEmpireRow,
  upsertUserEmpireFromStores,
} from "@/lib/supabase/empire-sync";
import { createBrowserSupabaseClient } from "@/lib/supabase/client";
import {
  migrateLegacyPrefsFromLocalStorage,
  rehydrateAllStores,
  useEmperorStore,
  useEventStore,
  useMapStore,
  usePrefsStore,
  useQuestStore,
} from "@/store";

const UPLOAD_DEBOUNCE_MS = 2200;

const STORES = [
  useEmperorStore,
  useMapStore,
  useQuestStore,
  useEventStore,
  usePrefsStore,
] as const;

function getSupabaseOrNull() {
  try {
    return createBrowserSupabaseClient();
  } catch {
    return null;
  }
}

function runPostHydrateCatalog(): void {
  useQuestStore.getState().resetDailyQuests();
  useQuestStore.getState().ensureQuestBootstrap();
}

export function EmpireCloudSync() {
  const applyingRemote = useRef(false);
  const uploadTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const userIdRef = useRef<string | null>(null);
  const authListenerRef = useRef<{ unsubscribe: () => void } | null>(null);

  useEffect(() => {
    let cancelled = false;
    const unsubs: Array<() => void> = [];

    const clearSubs = () => {
      unsubs.forEach((u) => u());
      unsubs.length = 0;
    };

    const scheduleUpload = () => {
      const uid = userIdRef.current;
      if (!uid || applyingRemote.current) return;
      if (uploadTimer.current) clearTimeout(uploadTimer.current);
      uploadTimer.current = setTimeout(() => {
        uploadTimer.current = null;
        if (cancelled || applyingRemote.current) return;
        const supabase = getSupabaseOrNull();
        if (!supabase) return;
        void upsertUserEmpireFromStores(supabase, uid).then((r) => {
          if (!r.ok) {
            console.warn("[EmpireCloudSync] 上传失败:", r.message);
          }
        });
      }, UPLOAD_DEBOUNCE_MS);
    };

    const attachUploadSubs = () => {
      clearSubs();
      for (const store of STORES) {
        unsubs.push(
          store.subscribe(() => {
            if (applyingRemote.current) return;
            scheduleUpload();
          })
        );
      }
    };

    const bootstrapCloudForUser = async (
      supabase: NonNullable<ReturnType<typeof getSupabaseOrNull>>,
      userId: string
    ) => {
      if (userIdRef.current === userId && unsubs.length > 0) {
        return;
      }
      userIdRef.current = userId;

      const row = await fetchUserEmpireRow(supabase, userId);
      if (cancelled) return;

      if (!row) {
        const up = await upsertUserEmpireFromStores(supabase, userId);
        if (!up.ok) {
          console.warn("[EmpireCloudSync] 首次种子上传失败:", up.message);
        }
      } else {
        applyingRemote.current = true;
        try {
          const applied = applyCloudUserEmpireRow(row);
          if (!applied) {
            const up = await upsertUserEmpireFromStores(supabase, userId);
            if (!up.ok) {
              console.warn("[EmpireCloudSync] 空快照回填上传失败:", up.message);
            }
          }
        } finally {
          applyingRemote.current = false;
        }
      }

      runPostHydrateCatalog();
      attachUploadSubs();
    };

    void (async () => {
      await rehydrateAllStores();
      migrateLegacyPrefsFromLocalStorage();

      const supabase = getSupabaseOrNull();
      if (!supabase) {
        runPostHydrateCatalog();
        return;
      }

      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (cancelled) return;

      if (user) {
        await bootstrapCloudForUser(supabase, user.id);
      } else {
        userIdRef.current = null;
        runPostHydrateCatalog();
      }

      const { data } = supabase.auth.onAuthStateChange(async (event, session) => {
        if (cancelled) return;
        if (event === "INITIAL_SESSION") return;

        if (event === "SIGNED_OUT" || !session?.user) {
          clearSubs();
          userIdRef.current = null;
          if (uploadTimer.current) clearTimeout(uploadTimer.current);
          runPostHydrateCatalog();
          return;
        }

        if (event === "SIGNED_IN" && session.user) {
          await bootstrapCloudForUser(supabase, session.user.id);
        }
      });

      authListenerRef.current = data.subscription;
    })();

    return () => {
      cancelled = true;
      authListenerRef.current?.unsubscribe();
      authListenerRef.current = null;
      userIdRef.current = null;
      if (uploadTimer.current) clearTimeout(uploadTimer.current);
      clearSubs();
    };
  }, []);

  return null;
}
