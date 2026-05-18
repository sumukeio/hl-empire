import { operationAtIso } from "@/lib/beijing-time";
import {
  appendWorkSessionOperation,
  createClientWorkSessionId,
  startWorkSession,
} from "@/lib/activity-journal-bridge";
import type { City, Quest, QuestWorkOperationKind } from "@/store/types";

export function formatCityDisplay(city: City): string {
  const alias = city.alias?.trim();
  return alias ? `${city.name} · ${alias}` : city.name;
}

export async function recordQuestTimerStart(params: {
  clientSessionId: string;
  quest: Quest;
  city: City;
}): Promise<void> {
  await startWorkSession({
    clientSessionId: params.clientSessionId,
    questId: params.quest.id,
    questTitle: params.quest.title,
    cityId: params.city.id,
    cityDisplay: formatCityDisplay(params.city),
    affiliation: params.quest.affiliation ?? "city",
    period: params.quest.period,
    sessionKind: "single",
    standardMinutes: Math.max(1, params.quest.minCompletionTime ?? 10),
    startKind: "timer_start",
  });
}

export async function recordBatchTimerStart(params: {
  clientSessionId: string;
  quest: Quest;
  cityIds: string[];
}): Promise<void> {
  await startWorkSession({
    clientSessionId: params.clientSessionId,
    questId: params.quest.id,
    questTitle: params.quest.title,
    cityId: null,
    cityDisplay: `集团军 · ${params.cityIds.length} 城`,
    affiliation: params.quest.affiliation ?? "city",
    period: params.quest.period,
    sessionKind: "batch",
    batchCityIds: params.cityIds,
    batchCityCount: params.cityIds.length,
    standardMinutes: Math.max(1, params.quest.minCompletionTime ?? 10),
    startKind: "batch_start",
  });
}

export function newWorkSessionId(): string {
  return createClientWorkSessionId();
}

export async function recordWorkOp(
  clientSessionId: string | undefined,
  kind: QuestWorkOperationKind,
  extra?: Record<string, unknown> & {
    status?: "open" | "completed" | "cancelled" | "voided";
    effectiveDurationMs?: number | null;
    effectiveDurationMinutes?: number | null;
    decreeClientLogId?: string | null;
  }
): Promise<void> {
  if (!clientSessionId) return;
  const at = operationAtIso();
  const { status, effectiveDurationMs, effectiveDurationMinutes, decreeClientLogId, ...rest } =
    extra ?? {};
  await appendWorkSessionOperation(
    clientSessionId,
    { kind, at, ...rest },
    {
      ...(status ? { status } : {}),
      ...(effectiveDurationMs !== undefined ? { effectiveDurationMs } : {}),
      ...(effectiveDurationMinutes !== undefined
        ? { effectiveDurationMinutes }
        : {}),
      ...(decreeClientLogId !== undefined ? { decreeClientLogId } : {}),
    }
  );
}
