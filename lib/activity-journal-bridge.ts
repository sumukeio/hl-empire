import type { SupabaseClient } from "@supabase/supabase-js";

import { operationAtIso } from "@/lib/beijing-time";
import {
  deleteEventLogFromCloud,
  fetchEventLogsFromCloud,
  fetchWorkSessionsFromCloud,
  insertWorkSessionToCloud,
  updateWorkSessionOnCloud,
  upsertEventLogToCloud,
  type CreateWorkSessionInput,
  type PatchWorkSessionInput,
} from "@/lib/supabase/activity-journal-sync";
import type {
  EventLog,
  QuestWorkOperation,
  QuestWorkSessionRecord,
} from "@/store/types";
import { useWorkSessionStore } from "@/store/work-session-store";

let boundSupabase: SupabaseClient | null = null;
let boundUserId: string | null = null;

const sessionByClientId = new Map<string, QuestWorkSessionRecord>();

function newClientSessionId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return `ws-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

export function bindActivityJournalSync(
  supabase: SupabaseClient | null,
  userId: string | null
): void {
  boundSupabase = supabase;
  boundUserId = userId;
  sessionByClientId.clear();
  if (!supabase || !userId) {
    sessionByClientId.clear();
  }
}

export function isActivityJournalCloudBound(): boolean {
  return Boolean(boundSupabase && boundUserId);
}

export async function hydrateActivityJournalFromCloud(): Promise<{
  logs: EventLog[];
  sessions: QuestWorkSessionRecord[];
}> {
  if (!boundSupabase || !boundUserId) {
    return { logs: [], sessions: [] };
  }
  const [logs, sessions] = await Promise.all([
    fetchEventLogsFromCloud(boundSupabase, boundUserId),
    fetchWorkSessionsFromCloud(boundSupabase, boundUserId),
  ]);
  sessionByClientId.clear();
  for (const s of sessions) {
    sessionByClientId.set(s.clientSessionId, s);
  }
  return { logs, sessions };
}

export function syncEventLogToCloud(log: EventLog): void {
  if (!boundSupabase || !boundUserId) return;
  void upsertEventLogToCloud(boundSupabase, boundUserId, log);
}

export function removeEventLogFromCloud(clientLogId: string): void {
  if (!boundSupabase || !boundUserId) return;
  void deleteEventLogFromCloud(boundSupabase, boundUserId, clientLogId);
}

function cacheSession(rec: QuestWorkSessionRecord): void {
  sessionByClientId.set(rec.clientSessionId, rec);
  useWorkSessionStore.getState().upsertSession(rec);
}

async function pushSessionPatch(
  clientSessionId: string,
  patch: PatchWorkSessionInput
): Promise<void> {
  const prev = sessionByClientId.get(clientSessionId);
  if (!prev) return;
  const next: QuestWorkSessionRecord = {
    ...prev,
    operations: patch.operations,
    lastActionAt: patch.lastActionAt,
    ...(patch.status ? { status: patch.status } : {}),
    ...(patch.effectiveDurationMs !== undefined
      ? { effectiveDurationMs: patch.effectiveDurationMs }
      : {}),
    ...(patch.effectiveDurationMinutes !== undefined
      ? { effectiveDurationMinutes: patch.effectiveDurationMinutes }
      : {}),
    ...(patch.standardMinutes !== undefined
      ? { standardMinutes: patch.standardMinutes }
      : {}),
    ...(patch.decreeClientLogId !== undefined
      ? { decreeClientLogId: patch.decreeClientLogId }
      : {}),
  };
  cacheSession(next);
  if (boundSupabase && boundUserId) {
    await updateWorkSessionOnCloud(
      boundSupabase,
      boundUserId,
      clientSessionId,
      patch
    );
  }
}

export async function appendWorkSessionOperation(
  clientSessionId: string,
  operation: QuestWorkOperation,
  extra?: Partial<
    Pick<
      PatchWorkSessionInput,
      | "status"
      | "effectiveDurationMs"
      | "effectiveDurationMinutes"
      | "standardMinutes"
      | "decreeClientLogId"
    >
  >
): Promise<void> {
  const prev = sessionByClientId.get(clientSessionId);
  if (!prev) return;
  const operations = [...prev.operations, operation];
  await pushSessionPatch(clientSessionId, {
    operations,
    lastActionAt: operation.at,
    ...extra,
  });
}

export function createClientWorkSessionId(): string {
  return newClientSessionId();
}

export async function startWorkSession(
  input: Omit<CreateWorkSessionInput, "firstOperation"> & {
    startKind?: "timer_start" | "batch_start";
  }
): Promise<string> {
  const clientSessionId = input.clientSessionId;
  const at = operationAtIso();
  const firstOperation: QuestWorkOperation = {
    kind: input.startKind ?? "timer_start",
    at,
  };
  const rec: QuestWorkSessionRecord = {
    clientSessionId,
    questId: input.questId,
    questTitle: input.questTitle,
    cityId: input.cityId,
    cityDisplay: input.cityDisplay,
    affiliation: input.affiliation,
    period: input.period,
    sessionKind: input.sessionKind,
    status: "open",
    operations: [firstOperation],
    batchCityIds: input.batchCityIds ?? null,
    batchCityCount: input.batchCityCount ?? null,
    standardMinutes: input.standardMinutes ?? null,
    effectiveDurationMs: null,
    effectiveDurationMinutes: null,
    firstActionAt: at,
    lastActionAt: at,
    decreeClientLogId: null,
  };
  cacheSession(rec);
  if (boundSupabase && boundUserId) {
    await insertWorkSessionToCloud(boundSupabase, boundUserId, {
      ...input,
      firstOperation,
    });
  }
  return clientSessionId;
}

export function getCachedWorkSession(
  clientSessionId: string
): QuestWorkSessionRecord | undefined {
  return sessionByClientId.get(clientSessionId);
}
