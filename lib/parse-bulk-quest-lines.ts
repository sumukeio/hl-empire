import type {
  Quest,
  QuestCompensationType,
  QuestOccurrence,
  QuestPeriod,
} from "@/store/types";

const PERIODS: QuestPeriod[] = ["早朝", "晌午", "傍晚", "深夜"];

function isQuestPeriod(s: string): s is QuestPeriod {
  return PERIODS.includes(s as QuestPeriod);
}

export type BulkQuestDraft = Pick<
  Quest,
  | "title"
  | "period"
  | "expReward"
  | "staminaCost"
  | "minCompletionTime"
  | "compensationType"
  | "occurrence"
>;

export type BulkQuestParseError = { line: number; message: string };

type ParseLineResult =
  | { ok: true; draft: BulkQuestDraft }
  | { ok: false; message: string };

function normalizeCompensationToken(raw: string): QuestCompensationType | null {
  const t = raw.trim();
  if (!t) return null;
  const u = t.toLowerCase();
  if (
    /^(绝对|不可弥补)$/.test(t) ||
    u === "absolute" ||
    u === "abs" ||
    u === "a"
  ) {
    return "absolute";
  }
  if (
    /^(可补办|可弥补|可疯狂弥补)$/.test(t) ||
    u === "compensable" ||
    u === "c"
  ) {
    return "compensable";
  }
  return null;
}

function normalizeOccurrenceToken(raw: string): QuestOccurrence | null {
  const t = raw.trim();
  if (!t) return null;
  const u = t.toLowerCase().replace(/_/g, "");
  if (/^(一次性)$/.test(t) || u === "onetime") {
    return "one_time";
  }
  if (/^(每日一次)$/.test(t) || u === "dailyonce") {
    return "daily_once";
  }
  if (/^(每日多次)$/.test(t) || u === "dailymultiple" || u === "multi") {
    return "daily_multiple";
  }
  return null;
}

/** 固定尾：时段、功勋、体力，及可选「分钟、补救、时效」（顺序不可跳列） */
function parseTailSegment(
  tail: string[]
):
  | {
      ok: true;
      period: QuestPeriod;
      expReward: number;
      staminaCost: number;
      minCompletionTime: number;
      compensationType: QuestCompensationType;
      occurrence: QuestOccurrence;
    }
  | { ok: false } {
  const L = tail.length;
  if (L < 3 || L > 6) return { ok: false };
  const periodRaw = tail[0]!;
  if (!isQuestPeriod(periodRaw)) return { ok: false };
  const expParsed = Number.parseInt(tail[1] ?? "", 10);
  const stParsed = Number.parseInt(tail[2] ?? "", 10);
  if (!Number.isFinite(expParsed) || !Number.isFinite(stParsed)) {
    return { ok: false };
  }
  const expReward = Math.max(0, expParsed);
  const staminaCost = Math.max(0, stParsed);
  let minCompletionTime = 10;
  let compensationType: QuestCompensationType = "compensable";
  let occurrence: QuestOccurrence = "daily_once";
  if (L >= 4) {
    const m = Number.parseInt(tail[3]!, 10);
    if (!Number.isFinite(m) || m < 1) return { ok: false };
    minCompletionTime = Math.min(9999, Math.floor(m));
  }
  if (L >= 5) {
    const c = normalizeCompensationToken(tail[4]!);
    if (c === null) return { ok: false };
    compensationType = c;
  }
  if (L >= 6) {
    const o = normalizeOccurrenceToken(tail[5]!);
    if (o === null) return { ok: false };
    occurrence = o;
  }
  return {
    ok: true,
    period: periodRaw,
    expReward,
    staminaCost,
    minCompletionTime,
    compensationType,
    occurrence,
  };
}

function parseParts(parts: string[], joiner: string): ParseLineResult {
  const clean = parts.map((s) => s.trim()).filter((s) => s.length > 0);
  if (clean.length < 4) {
    return {
      ok: false,
      message:
        "字段不足。至少：标题 + 时段 + 功勋 + 体力；可选后缀：分钟、补救、时效（见枢密院说明）",
    };
  }
  for (let opt = 3; opt >= 0; opt--) {
    const tailLen = 3 + opt;
    if (clean.length < tailLen + 1) continue;
    const tail = clean.slice(-tailLen);
    const parsed = parseTailSegment(tail);
    if (!parsed.ok) continue;
    const title = clean.slice(0, -tailLen).join(joiner).trim();
    if (!title) continue;
    return {
      ok: true,
      draft: {
        title,
        period: parsed.period,
        expReward: parsed.expReward,
        staminaCost: parsed.staminaCost,
        minCompletionTime: parsed.minCompletionTime,
        compensationType: parsed.compensationType,
        occurrence: parsed.occurrence,
      },
    };
  }
  return {
    ok: false,
    message:
      "无法解析：时段须在倒数第三列；其后为功勋、体力；再后可接最短耗时(分钟)、补救(不可弥补/可补办)、时效(一次性/每日一次/每日多次)，且不可跳列",
  };
}

/**
 * 解析单行，优先级：
 * 1) **Tab** 分列（推荐；标题可含 Tab 以外的分隔；在输入框内按 Tab 会插入制表符）
 * 2) **竖线 |** 分列（手打效率最高，标题内勿用 |）
 * 3) **逗号** 分列：取 **末尾固定列**（见下），前面合并为标题（标题可含中英文逗号）
 * 4) 无逗号时按 **空白** 分列，末段规则同上
 *
 * **列顺序**（自左向右）：`标题 … | 时段 | 功勋 | 体力 | [最短耗时分钟] | [补救] | [时效]`  
 * 补救：`不可弥补` / `绝对` / `absolute` 或 `可补办` / `可弥补` / `compensable`  
 * 时效：`一次性` / `每日一次` / `每日多次`（英文 `one_time` / `daily_once` / `daily_multiple` 亦可）
 */
export function parseQuestLineResult(line: string): ParseLineResult {
  const trimmed = line.trim();
  if (!trimmed) {
    return { ok: false, message: "空行" };
  }

  if (trimmed.includes("\t")) {
    const parts = trimmed.split("\t");
    return parseParts(parts, "\t");
  }

  if (trimmed.includes("|")) {
    const parts = trimmed.split("|");
    return parseParts(parts, "|");
  }

  const commaParts = trimmed.split(/[,，]/);
  if (commaParts.length >= 4) {
    return parseParts(commaParts, "，");
  }

  const segments = trimmed.split(/\s+/);
  return parseParts(segments, " ");
}

export function parseBulkQuestText(text: string): {
  items: BulkQuestDraft[];
  errors: BulkQuestParseError[];
} {
  const lines = text.split(/\r?\n/);
  const items: BulkQuestDraft[] = [];
  const errors: BulkQuestParseError[] = [];

  for (let i = 0; i < lines.length; i++) {
    const raw = lines[i];
    if (raw === undefined) continue;
    const lineNum = i + 1;
    if (!raw.trim()) continue;

    const r = parseQuestLineResult(raw);
    if (!r.ok) {
      errors.push({ line: lineNum, message: r.message });
      continue;
    }
    items.push(r.draft);
  }

  return { items, errors };
}
