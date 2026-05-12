import type { Quest, QuestPeriod } from "@/store/types";

const PERIODS: QuestPeriod[] = ["早朝", "晌午", "傍晚", "深夜"];

function isQuestPeriod(s: string): s is QuestPeriod {
  return PERIODS.includes(s as QuestPeriod);
}

export type BulkQuestDraft = Pick<
  Quest,
  "title" | "period" | "expReward" | "staminaCost"
>;

export type BulkQuestParseError = { line: number; message: string };

type ParseLineResult =
  | { ok: true; draft: BulkQuestDraft }
  | { ok: false; message: string };

/**
 * 解析单行：`标题, 时段, 功勋, 体力`（中英文逗号）或空格分隔（标题可含空格，取末三格为时段/功勋/体力）。
 * 功勋、体力缺省分别为 10、5。
 */
export function parseQuestLineResult(line: string): ParseLineResult {
  const trimmed = line.trim();
  if (!trimmed) {
    return { ok: false, message: "空行" };
  }

  const hasComma = /[,，]/.test(trimmed);
  const segments = hasComma
    ? trimmed.split(/[,，]/).map((s) => s.trim()).filter(Boolean)
    : trimmed.split(/\s+/).filter(Boolean);

  if (segments.length < 2) {
    return { ok: false, message: "字段不足（至少需标题与时段）" };
  }

  let title: string;
  let periodRaw: string;
  let expPart: string | undefined;
  let staminaPart: string | undefined;

  if (hasComma) {
    if (segments.length >= 4) {
      title = segments[0]!;
      periodRaw = segments[1]!;
      expPart = segments[2];
      staminaPart = segments[3];
    } else if (segments.length === 3) {
      title = segments[0]!;
      periodRaw = segments[1]!;
      expPart = segments[2];
    } else {
      title = segments[0]!;
      periodRaw = segments[1]!;
    }
  } else if (segments.length >= 4) {
    periodRaw = segments[segments.length - 3]!;
    expPart = segments[segments.length - 2];
    staminaPart = segments[segments.length - 1];
    title = segments.slice(0, -3).join(" ");
  } else if (segments.length === 3) {
    title = segments[0]!;
    periodRaw = segments[1]!;
    expPart = segments[2];
  } else {
    title = segments[0]!;
    periodRaw = segments[1]!;
  }

  if (!title) {
    return { ok: false, message: "标题为空" };
  }
  if (!isQuestPeriod(periodRaw)) {
    return {
      ok: false,
      message: `无效时段「${periodRaw}」，须为：早朝 / 晌午 / 傍晚 / 深夜`,
    };
  }

  const expParsed = expPart !== undefined ? Number.parseInt(expPart, 10) : NaN;
  const staminaParsed =
    staminaPart !== undefined ? Number.parseInt(staminaPart, 10) : NaN;

  const expReward = Number.isFinite(expParsed) ? Math.max(0, expParsed) : 10;
  const staminaCost = Number.isFinite(staminaParsed)
    ? Math.max(0, staminaParsed)
    : 5;

  return {
    ok: true,
    draft: {
      title,
      period: periodRaw,
      expReward,
      staminaCost,
    },
  };
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
