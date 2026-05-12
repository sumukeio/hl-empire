import type { City, EventLog, EventLogType, Quest } from "@/store/types";
import { migrateCity } from "@/store/map-store";
import { migrateQuest } from "@/store/quest-store";
import type { PrefsState } from "@/store/prefs-store";
import { parsePrefsJson } from "@/store/prefs-store";
import { useEmperorStore } from "@/store/emperor-store";
import { useEventStore } from "@/store/event-store";
import { useMapStore } from "@/store/map-store";
import { usePrefsStore } from "@/store/prefs-store";
import { useQuestStore } from "@/store/quest-store";

export const EMPIRE_BACKUP_VERSION = 1 as const;

function parseEventLogType(v: unknown): EventLogType {
  if (v === "decree" || v === "battle" || v === "treasury" || v === "info") {
    return v;
  }
  return "info";
}

function parseLogEmphasis(v: unknown): EventLog["emphasis"] | undefined {
  if (v === "calamity" || v === "goldFlash") return v;
  return undefined;
}

export type EmpireBackupV1 = {
  version: typeof EMPIRE_BACKUP_VERSION;
  exportedAt: string;
  emperor: {
    level: number;
    exp: number;
    stamina: number;
    gold: number;
    troops: number;
    health: number;
    martialArts: number;
    tokens: number;
    isDressed: boolean;
    isEntertaining: boolean;
    entertainmentDeadline: number | null;
    entertainmentLowHealthPenalty: boolean;
    healthCombo: number;
    morale: number;
    privateVault: number;
    literature: number;
    isNomadMode: boolean;
  };
  map: { cities: City[] };
  quest: { quests: Quest[]; lastLoginDate: string; activeCityId: string | null };
  events: { logs: EventLog[] };
  /** 可选：与 prefs_json 同形；旧密函可无此字段 */
  prefs?: PrefsState;
};

const MAX_LOGS = 80;

function formatBackupDateYmd(): string {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}${m}${day}`;
}

export function collectEmpireBackup(): EmpireBackupV1 {
  const e = useEmperorStore.getState();
  return {
    version: EMPIRE_BACKUP_VERSION,
    exportedAt: new Date().toISOString(),
    emperor: {
      level: e.level,
      exp: e.exp,
      stamina: e.stamina,
      gold: e.gold,
      troops: e.troops,
      health: e.health,
      martialArts: e.martialArts,
      tokens: e.tokens,
      isDressed: e.isDressed,
      isEntertaining: e.isEntertaining,
      entertainmentDeadline: e.entertainmentDeadline,
      entertainmentLowHealthPenalty: e.entertainmentLowHealthPenalty,
      healthCombo: e.healthCombo,
      morale: e.morale,
      privateVault: e.privateVault,
      literature: e.literature,
      isNomadMode: e.isNomadMode,
    },
    map: { cities: [...useMapStore.getState().cities] },
    quest: {
      quests: [...useQuestStore.getState().quests],
      lastLoginDate: useQuestStore.getState().lastLoginDate,
      activeCityId: useQuestStore.getState().activeCityId,
    },
    events: { logs: [...useEventStore.getState().logs] },
    prefs: {
      oracleFirstOrderJiebaoDate: usePrefsStore.getState().oracleFirstOrderJiebaoDate,
      redlineMorningStallLoggedDays: {
        ...usePrefsStore.getState().redlineMorningStallLoggedDays,
      },
    },
  };
}

export function triggerEmpireBackupDownload(): void {
  const data = collectEmpireBackup();
  const json = JSON.stringify(data, null, 2);
  const blob = new Blob([json], { type: "application/json;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `hanling-empire-backup-${formatBackupDateYmd()}.json`;
  a.rel = "noopener";
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

function clamp(n: number, lo: number, hi: number): number {
  return Math.min(hi, Math.max(lo, n));
}

function computeLevelFromExp(totalExp: number): number {
  return Math.max(1, Math.floor(totalExp / 100) + 1);
}

export function parseEmpireBackupJson(
  text: string
): { ok: true; data: EmpireBackupV1 } | { ok: false; error: string } {
  let parsed: unknown;
  try {
    parsed = JSON.parse(text) as unknown;
  } catch {
    return { ok: false, error: "JSON 解析失败，请检查文件是否为有效 UTF-8 文本。" };
  }
  if (!parsed || typeof parsed !== "object") {
    return { ok: false, error: "密函根节点须为 JSON 对象。" };
  }
  const root = parsed as Record<string, unknown>;
  if (root.version !== EMPIRE_BACKUP_VERSION) {
    return { ok: false, error: `不支持的密函版本（当前仅支持 version=${EMPIRE_BACKUP_VERSION}）。` };
  }
  const em = root.emperor;
  if (!em || typeof em !== "object") {
    return { ok: false, error: "缺少 emperor 区块。" };
  }
  const map = root.map;
  if (!map || typeof map !== "object" || !Array.isArray((map as { cities?: unknown }).cities)) {
    return { ok: false, error: "缺少 map.cities 数组。" };
  }
  const quest = root.quest;
  if (
    !quest ||
    typeof quest !== "object" ||
    !Array.isArray((quest as { quests?: unknown }).quests)
  ) {
    return { ok: false, error: "缺少 quest.quests 数组。" };
  }
  const events = root.events;
  if (!events || typeof events !== "object" || !Array.isArray((events as { logs?: unknown }).logs)) {
    return { ok: false, error: "缺少 events.logs 数组。" };
  }

  const e = em as Record<string, unknown>;
  const emperor: EmpireBackupV1["emperor"] = {
    level: typeof e.level === "number" && Number.isFinite(e.level) ? e.level : 1,
    exp: typeof e.exp === "number" && Number.isFinite(e.exp) ? Math.max(0, e.exp) : 0,
    stamina:
      typeof e.stamina === "number" && Number.isFinite(e.stamina)
        ? clamp(e.stamina, 0, 100)
        : 100,
    gold: typeof e.gold === "number" && Number.isFinite(e.gold) ? Math.max(0, e.gold) : 0,
    troops:
      typeof e.troops === "number" && Number.isFinite(e.troops) ? Math.max(0, e.troops) : 0,
    health:
      typeof e.health === "number" && Number.isFinite(e.health)
        ? clamp(e.health, 0, 100)
        : 100,
    martialArts:
      typeof e.martialArts === "number" && Number.isFinite(e.martialArts)
        ? Math.max(0, e.martialArts)
        : 10,
    tokens:
      typeof e.tokens === "number" && Number.isFinite(e.tokens) ? Math.max(0, e.tokens) : 0,
    isDressed: typeof e.isDressed === "boolean" ? e.isDressed : true,
    isEntertaining: typeof e.isEntertaining === "boolean" ? e.isEntertaining : false,
    entertainmentDeadline:
      typeof e.entertainmentDeadline === "number" && Number.isFinite(e.entertainmentDeadline)
        ? e.entertainmentDeadline
        : null,
    entertainmentLowHealthPenalty:
      typeof e.entertainmentLowHealthPenalty === "boolean"
        ? e.entertainmentLowHealthPenalty
        : false,
    healthCombo:
      typeof e.healthCombo === "number" && Number.isFinite(e.healthCombo)
        ? Math.max(0, Math.floor(e.healthCombo))
        : 0,
    morale:
      typeof e.morale === "number" && Number.isFinite(e.morale)
        ? clamp(e.morale, 0, 100)
        : 100,
    privateVault:
      typeof e.privateVault === "number" && Number.isFinite(e.privateVault)
        ? Math.max(0, e.privateVault)
        : 0,
    literature:
      typeof e.literature === "number" && Number.isFinite(e.literature)
        ? Math.max(0, e.literature)
        : 10,
    isNomadMode: typeof e.isNomadMode === "boolean" ? e.isNomadMode : false,
  };
  emperor.level = computeLevelFromExp(emperor.exp);

  const cities = (map as { cities: unknown[] }).cities.map((c) => migrateCity(c));
  const quests = (quest as { quests: unknown[] }).quests.map((q) => migrateQuest(q));
  const lastLoginDate =
    typeof (quest as { lastLoginDate?: unknown }).lastLoginDate === "string"
      ? ((quest as { lastLoginDate: string }).lastLoginDate)
      : "";
  const qRoot = quest as { activeCityId?: unknown };
  const activeCityId: string | null =
    qRoot.activeCityId === null
      ? null
      : typeof qRoot.activeCityId === "string"
        ? qRoot.activeCityId
        : null;
  const logsRaw = (events as { logs: unknown[] }).logs;
  const logs: EventLog[] = logsRaw
    .filter((l) => l && typeof l === "object")
    .map((l) => {
      const r = l as Record<string, unknown>;
      return {
        id: typeof r.id === "string" ? r.id : `log-${Date.now()}`,
        time: typeof r.time === "number" && Number.isFinite(r.time) ? r.time : Date.now(),
        message: typeof r.message === "string" ? r.message : "",
        type: parseEventLogType(r.type),
        ...(typeof r.cityName === "string" && r.cityName.trim()
          ? { cityName: r.cityName.trim() }
          : {}),
        ...(parseLogEmphasis(r.emphasis)
          ? { emphasis: parseLogEmphasis(r.emphasis) }
          : {}),
      };
    })
    .slice(0, MAX_LOGS);

  const prefs = root.prefs !== undefined ? parsePrefsJson(root.prefs) : undefined;

  const data: EmpireBackupV1 = {
    version: EMPIRE_BACKUP_VERSION,
    exportedAt:
      typeof root.exportedAt === "string" ? root.exportedAt : new Date().toISOString(),
    emperor,
    map: { cities },
    quest: { quests, lastLoginDate, activeCityId },
    events: { logs },
    ...(prefs ? { prefs } : {}),
  };
  return { ok: true, data };
}

/** 覆盖当前内存中的各 Store（会写入 persist）。 */
export function applyEmpireBackup(data: EmpireBackupV1): void {
  useEmperorStore.setState({
    ...data.emperor,
    level: computeLevelFromExp(data.emperor.exp),
  });
  useMapStore.setState({ cities: data.map.cities });
  useQuestStore.setState({
    quests: data.quest.quests,
    lastLoginDate: data.quest.lastLoginDate,
    activeCityId: data.quest.activeCityId ?? null,
  });
  useEventStore.setState({ logs: data.events.logs.slice(0, MAX_LOGS) });
  if (data.prefs) {
    usePrefsStore.setState({
      oracleFirstOrderJiebaoDate: data.prefs.oracleFirstOrderJiebaoDate,
      redlineMorningStallLoggedDays: {
        ...data.prefs.redlineMorningStallLoggedDays,
      },
    });
  }
}
