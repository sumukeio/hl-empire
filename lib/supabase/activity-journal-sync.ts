import type { SupabaseClient } from "@supabase/supabase-js";

import { getBeijingDateString } from "@/lib/beijing-time";
import type {
  EventLog,
  EventLogType,
  QuestWorkOperation,
  QuestWorkSessionRecord,
  QuestWorkSessionStatus,
} from "@/store/types";

export type EventLogRow = {
  id: string;
  user_id: string;
  client_log_id: string;
  occurred_at: string;
  beijing_date: string;
  message: string;
  log_type: string;
  city_name: string | null;
  emphasis: string | null;
  revert: unknown;
  created_at: string;
  updated_at: string;
};

export type QuestWorkSessionRow = {
  id: string;
  user_id: string;
  client_session_id: string;
  quest_id: string;
  quest_title: string;
  city_id: string | null;
  city_display: string | null;
  affiliation: string | null;
  period: string | null;
  session_kind: string;
  status: string;
  operations: QuestWorkOperation[];
  batch_city_ids: string[] | null;
  batch_city_count: number | null;
  standard_minutes: number | null;
  effective_duration_ms: number | null;
  effective_duration_minutes: number | null;
  first_action_at: string | null;
  last_action_at: string | null;
  decree_client_log_id: string | null;
  meta: Record<string, unknown>;
  created_at: string;
  updated_at: string;
};

const LOG_FETCH_LIMIT = 20_000;
const SESSION_FETCH_LIMIT = 20_000;

function parseLogType(v: string): EventLogType {
  if (v === "decree" || v === "battle" || v === "treasury" || v === "info") {
    return v;
  }
  return "info";
}

function parseEmphasis(
  v: string | null
): EventLog["emphasis"] | undefined {
  if (
    v === "calamity" ||
    v === "goldFlash" ||
    v === "goldFlashLong" ||
    v === "crimsonDecree"
  ) {
    return v;
  }
  return undefined;
}

export function eventLogRowToClient(row: EventLogRow): EventLog {
  const t = new Date(row.occurred_at).getTime();
  return {
    id: row.client_log_id,
    time: Number.isFinite(t) ? t : Date.now(),
    message: row.message,
    type: parseLogType(row.log_type),
    ...(row.city_name ? { cityName: row.city_name } : {}),
    ...(parseEmphasis(row.emphasis)
      ? { emphasis: parseEmphasis(row.emphasis) }
      : {}),
    ...(row.revert && typeof row.revert === "object"
      ? { revert: row.revert as EventLog["revert"] }
      : {}),
  };
}

export function eventLogToRow(
  userId: string,
  log: EventLog
): Omit<EventLogRow, "id" | "created_at" | "updated_at"> {
  return {
    user_id: userId,
    client_log_id: log.id,
    occurred_at: new Date(log.time).toISOString(),
    beijing_date: getBeijingDateString(log.time),
    message: log.message,
    log_type: log.type,
    city_name: log.cityName ?? null,
    emphasis: log.emphasis ?? null,
    revert: log.revert ?? null,
  };
}

export function sessionRowToClient(row: QuestWorkSessionRow): QuestWorkSessionRecord {
  const ops = Array.isArray(row.operations) ? row.operations : [];
  const batchIds = Array.isArray(row.batch_city_ids)
    ? row.batch_city_ids.filter((x): x is string => typeof x === "string")
    : null;
  return {
    id: row.id,
    clientSessionId: row.client_session_id,
    questId: row.quest_id,
    questTitle: row.quest_title,
    cityId: row.city_id,
    cityDisplay: row.city_display,
    affiliation:
      row.affiliation === "city" || row.affiliation === "tongwu"
        ? row.affiliation
        : null,
    period:
      row.period === "早朝" ||
      row.period === "晌午" ||
      row.period === "傍晚" ||
      row.period === "深夜"
        ? row.period
        : null,
    sessionKind: row.session_kind === "batch" ? "batch" : "single",
    status: row.status as QuestWorkSessionStatus,
    operations: ops,
    batchCityIds: batchIds,
    batchCityCount: row.batch_city_count,
    standardMinutes: row.standard_minutes,
    effectiveDurationMs:
      row.effective_duration_ms != null
        ? Number(row.effective_duration_ms)
        : null,
    effectiveDurationMinutes:
      row.effective_duration_minutes != null
        ? Number(row.effective_duration_minutes)
        : null,
    firstActionAt: row.first_action_at,
    lastActionAt: row.last_action_at,
    decreeClientLogId: row.decree_client_log_id,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export async function fetchEventLogsFromCloud(
  supabase: SupabaseClient,
  userId: string
): Promise<EventLog[]> {
  const { data, error } = await supabase
    .from("event_log")
    .select("*")
    .eq("user_id", userId)
    .order("occurred_at", { ascending: false })
    .limit(LOG_FETCH_LIMIT);

  if (error) {
    console.warn("[activity-journal] 拉取 event_log 失败:", error.message);
    return [];
  }
  return (data as EventLogRow[]).map(eventLogRowToClient);
}

export async function upsertEventLogToCloud(
  supabase: SupabaseClient,
  userId: string,
  log: EventLog
): Promise<void> {
  const row = eventLogToRow(userId, log);
  const { error } = await supabase.from("event_log").upsert(row, {
    onConflict: "user_id,client_log_id",
  });
  if (error) {
    console.warn("[activity-journal] upsert event_log 失败:", error.message);
  }
}

export async function deleteEventLogFromCloud(
  supabase: SupabaseClient,
  userId: string,
  clientLogId: string
): Promise<void> {
  const { error } = await supabase
    .from("event_log")
    .delete()
    .eq("user_id", userId)
    .eq("client_log_id", clientLogId);
  if (error) {
    console.warn("[activity-journal] delete event_log 失败:", error.message);
  }
}

export async function fetchWorkSessionsFromCloud(
  supabase: SupabaseClient,
  userId: string
): Promise<QuestWorkSessionRecord[]> {
  const { data, error } = await supabase
    .from("quest_work_session")
    .select("*")
    .eq("user_id", userId)
    .order("updated_at", { ascending: false })
    .limit(SESSION_FETCH_LIMIT);

  if (error) {
    console.warn(
      "[activity-journal] 拉取 quest_work_session 失败:",
      error.message
    );
    return [];
  }
  return (data as QuestWorkSessionRow[]).map(sessionRowToClient);
}

export type CreateWorkSessionInput = {
  clientSessionId: string;
  questId: string;
  questTitle: string;
  cityId: string | null;
  cityDisplay: string | null;
  affiliation: QuestWorkSessionRecord["affiliation"];
  period: QuestWorkSessionRecord["period"];
  sessionKind: QuestWorkSessionRecord["sessionKind"];
  batchCityIds?: string[] | null;
  batchCityCount?: number | null;
  standardMinutes?: number | null;
  firstOperation: QuestWorkOperation;
};

export async function insertWorkSessionToCloud(
  supabase: SupabaseClient,
  userId: string,
  input: CreateWorkSessionInput
): Promise<void> {
  const at = input.firstOperation.at;
  const { error } = await supabase.from("quest_work_session").insert({
    user_id: userId,
    client_session_id: input.clientSessionId,
    quest_id: input.questId,
    quest_title: input.questTitle,
    city_id: input.cityId,
    city_display: input.cityDisplay,
    affiliation: input.affiliation,
    period: input.period,
    session_kind: input.sessionKind,
    status: "open",
    operations: [input.firstOperation],
    batch_city_ids: input.batchCityIds ?? null,
    batch_city_count: input.batchCityCount ?? null,
    standard_minutes: input.standardMinutes ?? null,
    first_action_at: at,
    last_action_at: at,
  });
  if (error) {
    console.warn(
      "[activity-journal] insert quest_work_session 失败:",
      error.message
    );
  }
}

export type PatchWorkSessionInput = {
  operations: QuestWorkOperation[];
  status?: QuestWorkSessionStatus;
  effectiveDurationMs?: number | null;
  effectiveDurationMinutes?: number | null;
  standardMinutes?: number | null;
  lastActionAt: string;
  decreeClientLogId?: string | null;
};

export async function updateWorkSessionOnCloud(
  supabase: SupabaseClient,
  userId: string,
  clientSessionId: string,
  patch: PatchWorkSessionInput
): Promise<void> {
  const body: Record<string, unknown> = {
    operations: patch.operations,
    last_action_at: patch.lastActionAt,
  };
  if (patch.status) body.status = patch.status;
  if (patch.effectiveDurationMs != null) {
    body.effective_duration_ms = patch.effectiveDurationMs;
  }
  if (patch.effectiveDurationMinutes != null) {
    body.effective_duration_minutes = patch.effectiveDurationMinutes;
  }
  if (patch.standardMinutes != null) {
    body.standard_minutes = patch.standardMinutes;
  }
  if (patch.decreeClientLogId !== undefined) {
    body.decree_client_log_id = patch.decreeClientLogId;
  }

  const { error } = await supabase
    .from("quest_work_session")
    .update(body)
    .eq("user_id", userId)
    .eq("client_session_id", clientSessionId);

  if (error) {
    console.warn(
      "[activity-journal] update quest_work_session 失败:",
      error.message
    );
  }
}
