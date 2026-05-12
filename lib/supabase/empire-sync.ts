import type { SupabaseClient } from "@supabase/supabase-js";

import {
  EMPIRE_BACKUP_VERSION,
  applyEmpireBackup,
  collectEmpireBackup,
  parseEmpireBackupJson,
} from "@/lib/empire-backup";

export type UserEmpireRow = {
  user_id: string;
  emperor_json: unknown;
  map_json: unknown;
  quest_json: unknown;
  event_json: unknown;
  prefs_json: unknown;
  client_schema_version: number | null;
  updated_at: string;
};

function isCloudSnapshotEmpty(row: UserEmpireRow): boolean {
  const em = row.emperor_json;
  const map = row.map_json as { cities?: unknown } | null;
  const quest = row.quest_json as { quests?: unknown } | null;
  const emEmpty =
    !em || typeof em !== "object" || Object.keys(em as object).length === 0;
  const cities = map?.cities;
  const mapEmpty = !Array.isArray(cities) || cities.length === 0;
  const quests = quest?.quests;
  const questEmpty = !Array.isArray(quests) || quests.length === 0;
  return emEmpty && mapEmpty && questEmpty;
}

/**
 * 从云端行恢复各 Store；若快照为空则返回 `false`（由调用方执行本地上传种子）。
 */
export function applyCloudUserEmpireRow(row: UserEmpireRow): boolean {
  if (isCloudSnapshotEmpty(row)) {
    return false;
  }
  const wrapped = {
    version: EMPIRE_BACKUP_VERSION,
    exportedAt: new Date().toISOString(),
    emperor: row.emperor_json,
    map: row.map_json,
    quest: row.quest_json,
    events: row.event_json,
    prefs: row.prefs_json,
  };
  const parsed = parseEmpireBackupJson(JSON.stringify(wrapped));
  if (!parsed.ok) {
    console.warn("[empire-sync] 云端快照解析失败，跳过覆盖:", parsed.error);
    return false;
  }
  applyEmpireBackup(parsed.data);
  return true;
}

export async function fetchUserEmpireRow(
  supabase: SupabaseClient,
  userId: string
): Promise<UserEmpireRow | null> {
  const { data, error } = await supabase
    .from("user_empire")
    .select(
      "user_id, emperor_json, map_json, quest_json, event_json, prefs_json, client_schema_version, updated_at"
    )
    .eq("user_id", userId)
    .maybeSingle();

  if (error) {
    console.warn("[empire-sync] 拉取 user_empire 失败:", error.message);
    return null;
  }
  return data as UserEmpireRow | null;
}

export async function upsertUserEmpireFromStores(
  supabase: SupabaseClient,
  userId: string
): Promise<{ ok: true } | { ok: false; message: string }> {
  const backup = collectEmpireBackup();
  const { error } = await supabase.from("user_empire").upsert(
    {
      user_id: userId,
      emperor_json: backup.emperor,
      map_json: backup.map,
      quest_json: backup.quest,
      event_json: backup.events,
      prefs_json: backup.prefs ?? {
        oracleFirstOrderJiebaoDate: "",
        redlineMorningStallLoggedDays: {},
      },
      client_schema_version: EMPIRE_BACKUP_VERSION,
    },
    { onConflict: "user_id" }
  );
  if (error) {
    return { ok: false, message: error.message };
  }
  return { ok: true };
}
